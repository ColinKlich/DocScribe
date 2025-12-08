import DocscribeGPT, { DocscribeSettings, DEFAULT_SETTINGS } from 'src/main';
import { colorToHex } from 'src/utils/ColorConverter';
import { displayAppendButton, displayBotCopyButton, displayBotEditButton } from './Buttons';
import { addMessage, addParagraphBreaks } from './Message';
import { Component, MarkdownRenderer, setIcon } from 'obsidian';

export function displayBotMessage(plugin: DocscribeGPT, settings: DocscribeSettings, messageHistory: { role: string; content: string }[], message: string, component: Component) {
    const botMessageDiv = document.createElement('div');
    botMessageDiv.className = 'botMessage';

    botMessageDiv.style.setProperty('--docscribe-bot-message-background-color', colorToHex(settings.appearance.botMessageBackgroundColor || getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.appearance.botMessageBackgroundColor).trim()));
    botMessageDiv.style.setProperty('--docscribe-bot-message-font-color', settings.appearance.botMessageFontColor || DEFAULT_SETTINGS.appearance.botMessageFontColor);

    const botMessageToolBarDiv = document.createElement('div');
    botMessageToolBarDiv.className = 'botMessageToolBar';

    const buttonContainerDiv = document.createElement('div');
    buttonContainerDiv.className = 'button-container';

    const botNameSpan = document.createElement('span'); 
    botNameSpan.textContent = settings.appearance.chatbotName || DEFAULT_SETTINGS.appearance.chatbotName;
    botNameSpan.className = 'chatbotName';

    botMessageToolBarDiv.appendChild(botNameSpan);
    botMessageToolBarDiv.appendChild(buttonContainerDiv);
    const messageBlockDiv = document.createElement('div');
    messageBlockDiv.className = 'messageBlock';

    // Remove the rendered block tags from the message content
    const regexRenderedBlock = /<block-rendered>[\s\S]*?<\/block-rendered>/g;
    message = message.replace(regexRenderedBlock, '').trim();

    // Remove rendered note tags from the message content
    const regexRenderedNote = /<note-rendered>[\s\S]*?<\/note-rendered>/g;
    message = message.replace(regexRenderedNote, '').trim();

    MarkdownRenderer.render(plugin.app, message, messageBlockDiv, '', component).catch((error) => {
        console.error('Error rendering message:', error);
    });

    // Add buttons to the bot message
    if (!message.includes('commandBotMessage') && !message.includes('errorBotMessage')) {
        const editButton = displayBotEditButton(plugin, message, component);
        const copyBotButton = displayBotCopyButton(settings, message);
        const appendButton = displayAppendButton(plugin, settings, message);
        buttonContainerDiv.appendChild(editButton);
        buttonContainerDiv.appendChild(copyBotButton);
        buttonContainerDiv.appendChild(appendButton);

        addParagraphBreaks(messageBlockDiv); 
    } 
    
    const copyCodeBlocks: NodeListOf<HTMLElement> = messageBlockDiv.querySelectorAll('.copy-code-button');
    copyCodeBlocks.forEach((copyCodeBlock) => {
        copyCodeBlock.textContent = 'Copy';
        setIcon(copyCodeBlock, 'copy');
    });

    botMessageDiv.appendChild(botMessageToolBarDiv);
    botMessageDiv.appendChild(messageBlockDiv);

    return botMessageDiv;
}

export function displayLoadingBotMessage(settings: DocscribeSettings) {
    const botMessageDiv = document.createElement('div');
    botMessageDiv.className = 'botMessage';
    botMessageDiv.style.setProperty('--docscribe-bot-message-background-color', colorToHex(settings.appearance.botMessageBackgroundColor || getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.appearance.botMessageBackgroundColor).trim()));
    botMessageDiv.style.setProperty('--docscribe-bot-message-font-color', settings.appearance.botMessageFontColor || DEFAULT_SETTINGS.appearance.botMessageFontColor);

    const botMessageToolBarDiv = document.createElement('div');
    botMessageToolBarDiv.className = 'botMessageToolBar';

    const botNameSpan = document.createElement('span'); 
    botNameSpan.textContent = settings.appearance.chatbotName || DEFAULT_SETTINGS.appearance.chatbotName;
    botNameSpan.className = 'chatbotName';

    const messageBlockDiv = document.createElement('div');
    messageBlockDiv.className = 'messageBlock';

    const loadingEl = document.createElement('span');
    loadingEl.setAttribute('id', 'loading'); 
    for (let i = 0; i < 3; i++) {
        const dotSpan = document.createElement('span');
        dotSpan.textContent = '.';
        loadingEl.appendChild(dotSpan);
    }

    botMessageToolBarDiv.appendChild(botNameSpan);
    botMessageDiv.appendChild(botMessageToolBarDiv);
    botMessageDiv.appendChild(messageBlockDiv);

    // Dispaly loading animation
    botMessageDiv.appendChild(loadingEl);

    return botMessageDiv;
}

export function displayCommandBotMessage(plugin: DocscribeGPT, settings: DocscribeSettings, messageHistory: { role: string; content: string }[], message: HTMLElement){
    const botMessageDiv = document.createElement('div');
    botMessageDiv.className = 'botMessage';


    const botMessageToolBarDiv = document.createElement('div');
    botMessageToolBarDiv.className = 'botMessageToolBar';

    const botNameSpan = document.createElement('span'); 
    botNameSpan.textContent = settings.appearance.chatbotName || DEFAULT_SETTINGS.appearance.chatbotName;
    botNameSpan.className = 'chatbotName';

    const messageBlockDiv = document.createElement('div');
    messageBlockDiv.className = 'messageBlock';

    const displayCommandBotMessageDiv = document.createElement('div');
    displayCommandBotMessageDiv.className = 'commandBotMessage';
    displayCommandBotMessageDiv.appendChild(message);

    messageBlockDiv.appendChild(displayCommandBotMessageDiv);
    botMessageToolBarDiv.appendChild(botNameSpan);
    botMessageDiv.appendChild(botMessageToolBarDiv);
    botMessageDiv.appendChild(messageBlockDiv);

    const index = messageHistory.length - 1;

    addMessage(plugin, message, 'botMessage', settings, index).catch((error) => {
        console.error('Error adding message:', error);
    });

    return botMessageDiv;
}

export function displayErrorBotMessage(plugin: DocscribeGPT, settings: DocscribeSettings, messageHistory: { role: string; content: string }[], message: string){
    const botMessageDiv = document.createElement('div');
    botMessageDiv.className = 'botMessage';
    botMessageDiv.style.setProperty('--docscribe-bot-message-background-color', colorToHex(settings.appearance.botMessageBackgroundColor || getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.appearance.botMessageBackgroundColor).trim()));

    const botMessageToolBarDiv = document.createElement('div');
    botMessageToolBarDiv.className = 'botMessageToolBar';

    const botNameSpan = document.createElement('span'); 
    botNameSpan.textContent = settings.appearance.chatbotName || DEFAULT_SETTINGS.appearance.chatbotName;
    botNameSpan.className = 'chatbotName';

    const messageBlockDiv = document.createElement('div');
    messageBlockDiv.className = 'messageBlock';

    const displayErrorBotMessageDiv = document.createElement('div');
    displayErrorBotMessageDiv.className = 'errorBotMessage';

    const BotP = document.createElement('p');
    BotP.textContent = message;

    console.error(message);

    messageBlockDiv.appendChild(displayErrorBotMessageDiv);
    displayErrorBotMessageDiv.appendChild(BotP);
    botMessageToolBarDiv.appendChild(botNameSpan);
    botMessageDiv.appendChild(botMessageToolBarDiv);
    botMessageDiv.appendChild(messageBlockDiv);

    const index = messageHistory.length - 1;

    addMessage(plugin, messageBlockDiv, 'botMessage', this.settings, index).catch((error) => {
        console.error('Error adding message:', error);
    });

    return botMessageDiv;
}
