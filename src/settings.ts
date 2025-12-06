import { App, PluginSettingTab, TFile } from 'obsidian';
import DocscribeGPT, { DEFAULT_SETTINGS, updateSettingsFromFrontMatter } from './main';
import { addGeneralSettings } from './components/settings/GeneralSettings';
import { addAppearanceSettings } from './components/settings/AppearanceSettings';
import { addChatHistorySettings } from './components/settings/ChatHistorySettings';
import { addOllamaSettings } from './components/settings/OllamaSettings';
import { addAPIConnectionSettings } from './components/settings/ConnectionSettings';
import { addProfileSettings } from './components/settings/ProfileSettings';
import { addRESTAPIURLSettings } from './components/settings/RESTAPIURLSettings';
import { addEditorSettings } from './components/settings/EditorSettings';
import { addPromptSettings } from './components/settings/PromptSettings';

export class DocscribeSettingTab extends PluginSettingTab {
	plugin: DocscribeGPT;

	constructor(app: App, plugin: DocscribeGPT) {
		super(app, plugin);
		this.plugin = plugin;
	}

	async display(): Promise<void> {
		// Display settings information
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h1', { text: 'Docscribe settings' });

		// Create a container for the links
		const linkContainer = containerEl.createEl('div', { cls: 'settings-links' });

		// Define link data
		const links = [
			{ text: 'Changelog', href: 'https://github.com/colinklich/docscribe/releases' },
			{ text: 'Wiki', href: 'https://github.com/colinklich/docscribe/wiki' },
			{ text: 'Report a bug', href: 'https://github.com/colinklich/docscribe/issues' }
		];

		// Create links and separators
		links.forEach((link, index) => {
			if (index > 0) {
				linkContainer.createEl('span', {
					text: ' | ',
					cls: 'settings-link-separator'
				});
			}

			const linkEl = linkContainer.createEl('a', {
				text: link.text,
				href: link.href,
				cls: 'settings-link'
			});
		});

		containerEl.createEl('p', { text: 'Type `/help` in chat for commands.' });


		// Add horizontal rule
		addHorizontalRule(this.containerEl);

		// Display settings
		addProfileSettings(this.containerEl, this.plugin, this);
		addGeneralSettings(this.containerEl, this.plugin, this);
		addPromptSettings(this.containerEl, this.plugin, this);
		addAppearanceSettings(this.containerEl, this.plugin, this);
		addChatHistorySettings(this.containerEl, this.plugin, this);
		addEditorSettings(this.containerEl, this.plugin, this);		

		// Add horizontal rule
		addHorizontalRule(this.containerEl);

		// Display settings
		addOllamaSettings(this.containerEl, this.plugin, this);
		addRESTAPIURLSettings(this.containerEl, this.plugin, this);
		addAPIConnectionSettings(this.containerEl, this.plugin, this);

		// Add horizontal rule
		addHorizontalRule(this.containerEl);


		// Add reset button
		const resetButton = containerEl.createEl('a', {
			text: 'Reset settings',
			href: '#',
			cls: 'settings-reset-button'
		});

		resetButton.addEventListener('click', async (event) => {
			event.preventDefault();
			const confirmReset = confirm('Are you sure you want to reset all settings to default?');
			if (confirmReset) {
				const profilePathFile = this.plugin.settings.profiles.profileFolderPath + '/' + this.plugin.settings.profiles.profile;
				const profilePath = this.plugin.app.vault.getAbstractFileByPath(profilePathFile);
				if (!(profilePath instanceof TFile)) {
					console.warn('Profile file is not a valid TFile:', profilePathFile);
				return; // or handle error as appropriate
				}

				const defaultProfilePathFile = DEFAULT_SETTINGS.profiles.profileFolderPath + '/' + DEFAULT_SETTINGS.profiles.profile;
				const defaultProfilePath = this.plugin.app.vault.getAbstractFileByPath(defaultProfilePathFile);
				if (!(defaultProfilePath instanceof TFile)) {
					console.warn('Profile file is not a valid TFile:', defaultProfilePathFile);
				return; // or handle error as appropriate
				}

				if (profilePath) {
					if (profilePath.path === defaultProfilePath.path) {
						this.plugin.settings = DEFAULT_SETTINGS;
						await this.plugin.saveSettings();

						// @ts-ignore
						await this.plugin.app.plugins.disablePlugin(this.plugin.manifest.id);
						// @ts-ignore
						await this.plugin.app.plugins.enablePlugin(this.plugin.manifest.id);
					}
					else {
						const filenameMessageHistory = this.app.vault.configDir + '/plugins/docscribe/data/' + 'messageHistory_' + defaultProfilePath.name.replace('.md', '.json');
						this.app.vault.adapter.remove(filenameMessageHistory);
						this.plugin.app.fileManager.trashFile(profilePath);
						this.plugin.settings.profiles.profile = DEFAULT_SETTINGS.profiles.profile;
						await updateSettingsFromFrontMatter(this.plugin, defaultProfilePath);
						await this.plugin.saveSettings();
					}
				}

				requestAnimationFrame(() => {
					// @ts-ignore
					const refreshTab = this.plugin.app.setting.openTabById('docscribe');
					if (refreshTab) {
						refreshTab.display();
					} else {
						new DocscribeSettingTab(this.app, this.plugin).display();
					}
				});
			}
		});

		// const resetNotice = containerEl.createEl('p', {
		// 	text: 'Please reset your settings if you have recently updated from version <2.0.0.',
		// 	attr: {
		// 		style: 'font-size: 0.7rem; text-align: center;'
		// 	}
		// });

		// containerEl.appendChild(resetNotice);
	}
}

function addHorizontalRule(containerEl: HTMLElement) {
	const separator = document.createElement('hr');
	separator.classList.add('settings-hr');
	containerEl.appendChild(separator);
}