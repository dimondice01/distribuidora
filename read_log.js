const cp = require('child_process');
const output = cp.execSync('git log -p src\\components\\RedirectToApp.jsx').toString();
require('fs').writeFileSync('git_log_output.txt', output.substring(0, 5000));
