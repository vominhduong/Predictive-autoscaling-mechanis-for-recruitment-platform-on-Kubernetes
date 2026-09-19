"""Prepare a containerd config, preserving settings and checking actual imports.

Run through 02-install-node.sh, which validates, backs up and installs the result.
Requires Ubuntu's python3-toml package only for reading/writing TOML in main().
"""
import copy
import glob
from pathlib import Path
import sys


def configure(original, runtime_major, config_dir=None):
    config = copy.deepcopy(original)
    if config.get('imports'):
        if config_dir is None:
            raise ValueError('The live configuration directory is needed to check imports.')
        resolved_imports = []
        for pattern in config['imports']:
            path = Path(pattern)
            if not path.is_absolute():
                path = Path(config_dir) / path
            absolute_pattern = str(path.absolute())
            matches = sorted(glob.glob(absolute_pattern))
            if matches:
                raise ValueError('Imported configs need inspection: ' + ', '.join(matches))
            if not glob.has_magic(pattern):
                raise ValueError('Explicit import is missing; inspect it: ' + absolute_pattern)
            # An empty wildcard is not a loaded override. Keep it for future use.
            # Resolve it against the live directory so staging has the same meaning.
            resolved_imports.append(absolute_pattern)
        config['imports'] = resolved_imports
    version = config.get('version', 1)
    if version == 1:
        if config.get('plugins'):
            raise ValueError('Legacy plugin configuration needs manual migration.')
        version = 3 if runtime_major >= 2 else 2
        config['version'] = version
    if version not in (2, 3) or (version == 3 and runtime_major < 2):
        raise ValueError('Unsupported containerd config/runtime version combination.')
    cri_ids = {'cri', 'io.containerd.grpc.v1.cri',
               'io.containerd.cri.v1.runtime', 'io.containerd.cri.v1.images'}
    config['disabled_plugins'] = [p for p in config.get('disabled_plugins', [])
                                  if p not in cri_ids]
    plugin_id = ('io.containerd.cri.v1.runtime' if version == 3
                 else 'io.containerd.grpc.v1.cri')
    runtime = config.setdefault('plugins', {}).setdefault(plugin_id, {})
    containerd = runtime.setdefault('containerd', {})
    if containerd.get('default_runtime_name', 'runc') != 'runc':
        raise ValueError('Custom default runtime needs inspection.')
    runc = containerd.setdefault('runtimes', {}).setdefault('runc', {})
    if runc.get('runtime_type', 'io.containerd.runc.v2') != 'io.containerd.runc.v2':
        raise ValueError('Custom runc runtime type needs inspection.')
    runc['runtime_type'] = 'io.containerd.runc.v2'
    runc.setdefault('options', {})['SystemdCgroup'] = True
    return config


if __name__ == '__main__':
    import toml
    source, target, major = sys.argv[1:]
    with open(source, encoding='utf-8') as stream:
        current = toml.load(stream)
    updated = configure(current, int(major), config_dir='/etc/containerd')
    with open(target, 'w', encoding='utf-8') as stream:
        toml.dump(updated, stream)
    print('Prepared CRI + systemd cgroups; other configuration values preserved.')
