"""Regression checks for imported defaults; no third-party libraries required."""
import tempfile
import unittest
from pathlib import Path

from configure_runtime import configure


class RuntimeConfigTests(unittest.TestCase):
    def test_default_empty_import_glob_keeps_settings(self):
        with tempfile.TemporaryDirectory() as directory:
            pattern = str(Path(directory) / 'conf.d' / '*.toml')
            original = {'version': 3, 'imports': [pattern],
                        'disabled_plugins': ['cri', 'other'], 'root': '/custom/root'}
            updated = configure(original, 2, directory)
            self.assertEqual(updated['imports'], [pattern])
            self.assertEqual(updated['root'], '/custom/root')
            self.assertEqual(updated['disabled_plugins'], ['other'])
            self.assertEqual(original['disabled_plugins'], ['cri', 'other'])
            options = updated['plugins']['io.containerd.cri.v1.runtime']['containerd']['runtimes']['runc']['options']
            self.assertIs(options['SystemdCgroup'], True)

    def test_real_import_stops_before_mutation(self):
        with tempfile.TemporaryDirectory() as directory:
            imported = Path(directory) / 'extra.toml'
            imported.write_text('disabled_plugins = ["cri"]', encoding='utf-8')
            config = {'version': 3, 'imports': [str(Path(directory) / '*.toml')]}
            with self.assertRaisesRegex(ValueError, 'Imported configs need inspection'):
                configure(config, 2, directory)
            self.assertNotIn('plugins', config)
            self.assertEqual(imported.read_text(), 'disabled_plugins = ["cri"]')

    def test_relative_import_uses_live_directory(self):
        with tempfile.TemporaryDirectory() as directory:
            config = {'version': 3, 'imports': ['conf.d/*.toml']}
            updated = configure(config, 2, directory)
            self.assertEqual(updated['imports'], [str(Path(directory) / 'conf.d' / '*.toml')])
            folder = Path(directory) / 'conf.d'
            folder.mkdir()
            (folder / 'override.toml').write_text('version = 3')
            with self.assertRaises(ValueError):
                configure(config, 2, directory)

    def test_missing_explicit_file_is_not_silently_ignored(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ValueError, 'Explicit import is missing'):
                configure({'version': 3, 'imports': ['required.toml']}, 2, directory)

    def test_schema2_preserves_docker_related_settings(self):
        original = {'version': 2, 'disabled_plugins': ['cri'],
                    'grpc': {'address': '/run/containerd/containerd.sock'},
                    'plugins': {'io.containerd.grpc.v1.cri': {'containerd': {
                        'runtimes': {'runc': {'options': {'BinaryName': '/usr/bin/runc'}}}}}}}
        updated = configure(original, 2)
        self.assertEqual(updated['grpc'], original['grpc'])
        opts = updated['plugins']['io.containerd.grpc.v1.cri']['containerd']['runtimes']['runc']['options']
        self.assertEqual(opts['BinaryName'], '/usr/bin/runc')
        self.assertIs(opts['SystemdCgroup'], True)


if __name__ == '__main__':
    unittest.main()
