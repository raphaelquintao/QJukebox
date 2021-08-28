// Utils

export function qprint(args, color = '', b = false, n = '\n') {
    const RESET = '\u001b[0m';
    const BOLD = '\u001b[1m';
    const UNDERLINE = '\u001b[4m';
    
    let colors = {
        'black': '\u001b[30m',
        'red': '\u001b[31m',
        'green': '\u001b[32m',
        'yellow': "\u001b[33m",
        'blue': '\u001b[34m',
        'magenta': '\u001b[35m',
        'cyan': '\u001b[36m',
        'lgray': '\u001b[37m',
        'dgray': '\u001b[90m',
        'lred': '\u001b[91m',
        'lgreen': '\u001b[92m',
        'lyellow': "\u001b[93m",
        'lblue': '\u001b[94m',
        'lmagenta': '\u001b[95m',
        'lcyan': '\u001b[97m',
        'white': '\u001b[97m',
    }
    
    color = color !== '' ? colors[color] : color;
    b = b !== false ? BOLD : ''
    
    process.stdout.write(`${color}${b}${args}${RESET}${n}`);
}



// module.exports = {qprint};