import { SettingTab, setIcon } from 'obsidian';
import DocscribeGPT from 'src/main';
import { addOpenAIConnectionSettings } from './APIConnections/OpenAIConnections';
import { addMistralConnectionSettings } from './APIConnections/MistralConnections';
import { addGoogleGeminiConnectionSettings } from './APIConnections/GoogleGeminiConnections';
import { addAnthropicConnectionSettings } from './APIConnections/AnthropicConnections';
import { addOpenRouterConnectionSettings } from './APIConnections/OpenRouterConnections';

export function addAPIConnectionSettings(containerEl: HTMLElement, plugin: DocscribeGPT, SettingTab: SettingTab) {
    const toggleSettingContainer = containerEl.createDiv({ cls: 'toggleSettingContainer' });
    toggleSettingContainer.createEl('h2', { text: 'API connections' });

    const initialState = plugin.settings.toggleAPIConnectionSettings;
    const chevronIcon = toggleSettingContainer.createEl('span', { cls: 'chevron-icon' });
    setIcon(chevronIcon, initialState ? 'chevron-down' : 'chevron-right');

    // Create the settings container to be toggled
    const settingsContainer = containerEl.createDiv({ cls: 'settingsContainer' });
    settingsContainer.classList.toggle('hidden', !initialState);

    // Toggle visibility
    toggleSettingContainer.addEventListener('click', async () => {
        const isOpen = !settingsContainer.classList.contains('hidden');
        if (isOpen) {
            setIcon(chevronIcon, 'chevron-right'); // Close state
            settingsContainer.classList.add('hidden');
            plugin.settings.toggleAPIConnectionSettings = false;

        } else {
            setIcon(chevronIcon, 'chevron-down'); // Open state
            settingsContainer.classList.remove('hidden');
            plugin.settings.toggleAPIConnectionSettings = true;
        }
        plugin.saveSettings().catch(err => {console.error('Failed to save settings:', err);});
    });

    addAnthropicConnectionSettings(settingsContainer, plugin, SettingTab);
    addGoogleGeminiConnectionSettings(settingsContainer, plugin, SettingTab);
    addMistralConnectionSettings(settingsContainer, plugin, SettingTab);
    addOpenAIConnectionSettings(settingsContainer, plugin, SettingTab);
    addOpenRouterConnectionSettings(settingsContainer, plugin, SettingTab);
}

