import json, time
from http.server import BaseHTTPRequestHandler, HTTPServer
PARSED = {
  "action": "book", "equipment_id": "48291035", "equipment_type": "wheelchair",
  "patient_id": "PT-90421", "bed": "4B-12", "duration_hours": 504, "duration_label": "3 weeks",
  "corrections": ["equipment_id: 48291053 -> 48291035"],
  "ignored": ["Cushion in bed 7 reported broken (separate issue)"],
  "clarification": None, "confidence": "high",
  "summary": "Book wheelchair 4829 1035 to PT-90421 in Bed 4B-12 for 3 weeks.",
}
class H(BaseHTTPRequestHandler):
    def do_POST(self):
        self.rfile.read(int(self.headers.get("Content-Length", 0)))
        time.sleep(9)
        body = json.dumps({"candidates": [{"content": {"parts": [{"text": json.dumps(PARSED)}]}}]}).encode()
        self.send_response(200); self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body)
HTTPServer(("0.0.0.0", 8765), H).serve_forever()
