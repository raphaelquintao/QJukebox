// Utils

function qprint(args, color = '', b = false, n = '\n') {
    const RESET = '\033[0m'
    const BOLD = '\033[1m'
    const UNDERLINE = '\033[4m'
    const colors = {
        'black': '\033[30m',
        'red': '\033[31m',
        'green': '\033[32m',
        'yellow': '\033[33m',
        'blue': '\033[34m',
        'magenta': '\033[35m',
        'cyan': '\033[36m',
        'lgray': '\033[37m',
        'dgray': '\033[90m',
        'lred': '\033[91m',
        'lgreen': '\033[92m',
        'lyellow': '\033[93m',
        'lblue': '\033[94m',
        'lmagenta': '\033[95m',
        'lcyan': '\033[97m',
        'white': '\033[97m',
    }
    
    color = color !== '' ? colors[color] : color;
    b = b !== false ? BOLD : ''
    
    process.stdout.write(`${color}${b}${args}${RESET}${n}`);
}



module.exports = {qprint};