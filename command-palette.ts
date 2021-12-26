const entries: IEntries[] = []
const MAX_ENTRIES = 10
const commands: ICommand[] = []
let selectedIdx = 0
let filtered: ICommand[] = []

interface ICommand {
    name: string
    func: () => void
}
interface IEntries {
    parent: HTMLElement
    text: HTMLElement
}

export function initCommandPalette() {
    const output = document.createElement('div')
    //output.style.display = 'none'
    output.style.margin = '5px'
    output.style.padding = '5px'
    output.style.background = '#111111'
    output.style.position = 'absolute'
    output.style.top = '0px'
    output.style.left = '50%'
    document.body.prepend(output)

    const input = document.createElement('input')
    {
        // input.style.background = 'black'
        output.prepend(input)

        const filter = () => {
            console.log(input.value)
            filterCommands(input.value)
        }

        input.onkeyup = filter
        input.onkeydown = filter
    }

    for (let i = 0; i < MAX_ENTRIES; i++) {
        const div = document.createElement('div')
        const text = document.createElement('text')
        text.innerText = 'test'
        text.style.color = 'white'
        div.appendChild(text)
        output.append(div)
        entries.push({ parent: div, text })
    }

    filterCommands('')

    window.addEventListener('keydown', e => {
        console.log({ code: e.code, keyCode: e.keyCode, key: e.key })
        if (e.ctrlKey && e.key === 'p') {
            if (output.style.display === 'block') {
                output.style.display = 'none'
            } else {
                output.style.display = 'block'
                input.focus()
            }
        }
        if (e.key === 'Escape') {
            output.style.display = 'none'
        }
        const selectedIdx2 = selectedIdx
        if (e.key === 'ArrowDown') {
            selectedIdx++
        }
        if (e.key === 'ArrowUp') {
            selectedIdx--
        }
        if (e.key === 'Enter') {
            console.log('do command:', entries[selectedIdx].text.innerText)
            filtered[selectedIdx].func()
            output.style.display = 'none'
        }

        selectedIdx = wrap(selectedIdx, 0, Math.min(filtered.length - 1, entries.length - 1))

        if (selectedIdx !== selectedIdx2) {
            updatecolor()
        }
    })
}

export function wrap(x: number, min: number, max: number) {
    if (x < min) {
        x = max
    }
    if (x > max) {
        x = min
    }
    return x
}

export function filterCommands(filter: string) {
    filtered = commands.filter(command => {
        return command.name.includes(filter)
    })
    console.log('filtered', filter, filtered.length)
    for (let i = 0; i < filtered.length; i++) {
        const command = filtered[i];
        if (i < entries.length) {
            entries[i].text.innerText = command.name
            entries[i].parent.style.display = 'block'
        }
    }
    for (let i = filtered.length; i < entries.length; i++) {
        const element = entries[i];
        element.parent.style.display = 'none'
    }
    updatecolor()
}

function updatecolor() {

    for (let i = 0; i < entries.length; i++) {
        const element = entries[i];
        if (i === selectedIdx) {
            element.parent.style.background = 'blue'
        } else {
            element.parent.style.background = 'black'
        }
    }
}

export function addCommand(name: string, func?: () => void) {
    commands.push({ name, func })
}

export function addBoolean(name: string) {
    addCommand(`/${name}`)
    addCommand(`/${name} true`)
    addCommand(`/${name} false`)
}


