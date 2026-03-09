import json
import os
import re
from datetime import datetime
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse
import cgi

PORT = int(os.environ.get('PORT', '8000'))
ADMIN_SECRET = os.environ.get('ADMIN_SECRET', 'change-this-admin-secret')
ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT, 'data')
UPLOAD_DIR = os.path.join(ROOT, 'uploads')
DATA_FILE = os.path.join(DATA_DIR, 'submissions.json')

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)
if not os.path.exists(DATA_FILE):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump([], f)


def read_rows():
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def write_rows(rows):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(rows, f, indent=2)


def generate_tracking_id(rows):
    import random
    import string

    existing = {r['trackingId'] for r in rows}
    while True:
        suffix = ''.join(random.choice(string.ascii_uppercase + string.digits) for _ in range(6))
        tracking = f'DJMC35-{suffix}'
        if tracking not in existing:
            return tracking


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def _json(self, code, obj):
        payload = json.dumps(obj).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith('/api/status/'):
            tracking_id = parsed.path.replace('/api/status/', '', 1)
            rows = read_rows()
            row = next((r for r in rows if r['trackingId'] == tracking_id), None)
            if not row:
                return self._json(404, {'success': False, 'error': 'Tracking ID not found.'})
            return self._json(200, {'success': True, 'status': row.get('status', 'pending')})
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/submit':
            return self.handle_submit()
        if parsed.path == '/api/admin/update-status':
            return self.handle_admin_update()
        return self._json(404, {'success': False, 'error': 'Not found.'})

    def handle_submit(self):
        content_type = self.headers.get('Content-Type', '')
        if 'multipart/form-data' not in content_type:
            return self._json(400, {'success': False, 'error': 'Content-Type must be multipart/form-data'})

        form = cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={'REQUEST_METHOD': 'POST', 'CONTENT_TYPE': content_type},
        )

        full_name = form.getfirst('fullName', '').strip()
        facebook_link = form.getfirst('facebookLink', '').strip()
        admission_copy = form['admissionCopy'] if 'admissionCopy' in form else None
        result_screenshot = form['resultScreenshot'] if 'resultScreenshot' in form else None
        payment_receipt = form['paymentReceipt'] if 'paymentReceipt' in form else None

        if (
            not full_name
            or not facebook_link
            or admission_copy is None
            or result_screenshot is None
            or payment_receipt is None
        ):
            return self._json(400, {'success': False, 'error': 'Missing required fields/files.'})

        rows = read_rows()
        tracking_id = generate_tracking_id(rows)

        def save_file(field, label):
            original = os.path.basename(field.filename or f'{label}.jpg')
            ext = os.path.splitext(original)[1] or '.jpg'
            ext = re.sub(r'[^a-zA-Z0-9.]', '', ext) or '.jpg'
            name = f"{tracking_id.lower()}-{label}{ext}"
            target = os.path.join(UPLOAD_DIR, name)
            with open(target, 'wb') as f:
                f.write(field.file.read())
            return f'/uploads/{name}'

        record = {
            'trackingId': tracking_id,
            'submittedAt': datetime.utcnow().isoformat() + 'Z',
            'fullName': full_name,
            'facebookLink': facebook_link,
            'admissionCopyUrl': save_file(admission_copy, 'admission-copy'),
            'resultScreenshotUrl': save_file(result_screenshot, 'result-screenshot'),
            'paymentReceiptUrl': save_file(payment_receipt, 'payment-receipt'),
            'status': 'pending',
        }

        rows.append(record)
        write_rows(rows)
        return self._json(200, {'success': True, 'trackingId': tracking_id})

    def handle_admin_update(self):
        secret = self.headers.get('x-admin-secret', '')
        if secret != ADMIN_SECRET:
            return self._json(401, {'success': False, 'error': 'Unauthorized.'})

        content_length = int(self.headers.get('Content-Length', '0'))
        body = self.rfile.read(content_length).decode('utf-8')
        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            return self._json(400, {'success': False, 'error': 'Invalid JSON.'})

        tracking_id = str(payload.get('trackingId', '')).strip()
        status = str(payload.get('status', '')).strip()
        if status not in {'pending', 'verified', 'rejected'} or not tracking_id:
            return self._json(400, {'success': False, 'error': 'Invalid trackingId/status.'})

        rows = read_rows()
        row = next((r for r in rows if r['trackingId'] == tracking_id), None)
        if not row:
            return self._json(404, {'success': False, 'error': 'Tracking ID not found.'})

        row['status'] = status
        row['updatedAt'] = datetime.utcnow().isoformat() + 'Z'
        write_rows(rows)
        return self._json(200, {'success': True})


if __name__ == '__main__':
    httpd = ThreadingHTTPServer(('0.0.0.0', PORT), Handler)
    print(f'DJMC verification server running on http://localhost:{PORT}')
    httpd.serve_forever()
