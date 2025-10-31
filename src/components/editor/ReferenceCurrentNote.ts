import DocscribeGPT, { DocscribeSettings } from 'src/main';

let referenceCurrentNoteContent = '';

// Reference Current Note Indicator
export async function getActiveFileContent(plugin: DocscribeGPT, settings: DocscribeSettings) {
    const dotElement = document.querySelector('.dotIndicator');
    referenceCurrentNoteContent = '';
    if (settings.general.enableReferenceCurrentNote === true) {
        if (dotElement) {
            (dotElement as HTMLElement).addClass('dot-red');
            referenceCurrentNoteContent = '';
        }
        const activeFile = plugin.app.workspace.getActiveFile();
        if (activeFile?.extension === 'md') {
            if (dotElement) {
                (dotElement as HTMLElement).removeClass('dot-red');
            (dotElement as HTMLElement).addClass('dot-green');
            }
            const content = await plugin.app.vault.read(activeFile);
            const clearYamlContent = content.replace(/---[\s\S]+?---/, '').trim();
            referenceCurrentNoteContent = '\n\n' + 'Additional Note:' + '\n\n' + clearYamlContent + '\n\n';
        }
    }
    return referenceCurrentNoteContent;
}

export function getCurrentNoteContent() {
    return referenceCurrentNoteContent;
}