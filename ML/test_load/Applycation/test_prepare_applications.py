import unittest
from unittest.mock import patch
import tempfile
import os
import json
import base64
import time
from pathlib import Path
from prepare_applications import plan, pdf, main

class PreparationTests(unittest.TestCase):
    def test_plan_includes_ramp_area(self):
        self.assertEqual(plan('smoke', 1, 300), (1, 0))
        self.assertEqual(plan('constant', 2, 300), (601, 300))
        self.assertEqual(plan('ramp', 1, 300), (1981, 480))
    def test_invalid_rate(self):
        with self.assertRaises(ValueError): plan('constant', 0, 300)
    def test_pdf_offsets(self):
        data = pdf()
        start = int(data.split(b'startxref\n')[1].splitlines()[0])
        self.assertTrue(data[start:].startswith(b'xref'))
    def test_prepare_excludes_existing_and_handles_pagination(self):
        claims = base64.urlsafe_b64encode(json.dumps({'sub': 'candidate', 'exp': time.time()+3600}).encode()).decode().rstrip('=')
        token = 'header.' + claims + '.sig'
        pages = []
        def call(api, method, path, body=None, token=None, content_type=None):
            if path.startswith('/api/v1/jobs/'): return {'status': 'PUBLISHED', 'applicationDeadline': '2099-01-01'}
            if path.endswith('/login'): return {'accessToken': 'header.' + claims + '.sig'}
            if path.startswith('/api/v1/applications/me'):
                pages.append(path)
                return {'content': [{'jobId': 'job1'}] if 'page=0' in path else [], 'last': 'page=1' in path}
            if path.endswith('/cvs'): return [{'id': 'cv1', 'isDefault': True}]
            raise AssertionError(path)
        with tempfile.TemporaryDirectory() as folder:
            previous = os.getcwd()
            try:
                os.chdir(folder)
                Path('accounts.json').write_text(json.dumps([{'email': 'fake', 'password': 'fake'}]))
                Path('config.json').write_text(json.dumps({'accountsFile':'accounts.json', 'jobIds':['job1','job2','job2']}))
                with patch('prepare_applications.API.call', call), patch('sys.argv', ['prepare', '--config', 'config.json', '--output','out.json']): main()
                result = json.loads(Path('out.json').read_text())
                self.assertEqual([p['jobId'] for p in result['pairs']], ['job2'])
                self.assertEqual(len(pages), 2)
                self.assertNotIn('password', result['sessions'][0])
            finally: os.chdir(previous)

if __name__ == '__main__': unittest.main()
