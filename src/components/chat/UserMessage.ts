import DocscribeGPT, { DocscribeSettings, DEFAULT_SETTINGS } from 'src/main';
import { colorToHex } from 'src/utils/ColorConverter';
import { displayUserEditButton, displayTrashButton, displayUserCopyButton, regenerateUserButton } from './Buttons';

export function displayUserMessage(plugin: DocscribeGPT, settings: DocscribeSettings, message: string) {
    let trimmedMessage = message.trim();

    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'userMessage';
    userMessageDiv.style.setProperty('--docscribe-user-message-background-color', colorToHex(settings.appearance.userMessageBackgroundColor || getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.appearance.userMessageBackgroundColor).trim()));
    userMessageDiv.style.setProperty('--docscribe-user-message-font-color', settings.appearance.userMessageFontColor || DEFAULT_SETTINGS.appearance.userMessageFontColor);

    const userMessageToolBarDiv = document.createElement('div');
    userMessageToolBarDiv.className = 'userMessageToolBar';

    const buttonContainerDiv = document.createElement('div');
    buttonContainerDiv.className = 'button-container';

    const userNameSpan = document.createElement('span');
    userNameSpan.className = 'userName';
    userNameSpan.textContent = settings.appearance.userName || DEFAULT_SETTINGS.appearance.userName;

    userMessageToolBarDiv.appendChild(userNameSpan);
    userMessageToolBarDiv.appendChild(buttonContainerDiv);

    const userPre = document.createElement('pre');
    const preUserMessage = document.createElement('span');
    preUserMessage.className = 'preUserMessage';
    userPre.appendChild(preUserMessage);

    // Remove rendered note
    const regexRenderedNote = /<note-rendered>[\s\S]*?<\/note-rendered>/g;
    trimmedMessage = trimmedMessage.replace(regexRenderedNote, '').trim();

    preUserMessage.innerHTML = trimmedMessage;

    const regenerateButton = regenerateUserButton(plugin, settings);
    const editButton = displayUserEditButton(plugin, settings, userPre);
    const copyUserButton = displayUserCopyButton(userPre);
    const trashButton = displayTrashButton(plugin);


    if (!message.startsWith('/')) {
        buttonContainerDiv.appendChild(regenerateButton);
        buttonContainerDiv.appendChild(editButton);
    }

    buttonContainerDiv.appendChild(copyUserButton);
    buttonContainerDiv.appendChild(trashButton);
    userMessageDiv.appendChild(userMessageToolBarDiv);
    userMessageDiv.appendChild(userPre);

    return userMessageDiv;
}