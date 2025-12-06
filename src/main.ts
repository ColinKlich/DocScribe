import { DataWriteOptions, Plugin, TFile} from 'obsidian';
import { DocscribeView, VIEW_TYPE_CHATBOT, populateModelDropdown } from './view';
import { DocscribeSettingTab } from './settings';
import { promptSelectGenerateCommand, renameTitleCommand } from './components/editor/EditorCommands';
import { colorToHex, isValidHexColor } from './utils/ColorConverter';
import { DocscribeCodeBlockProcessor } from './components/editor/DocscribeCodeBlockProcessor';
import { extractStructuredText } from './utils/PptxExtractor';
import { extractTextFromPdf } from './utils/PdfExtractor';

export interface DocscribeSettings {
	profiles: {
		profile: string,
		profileFolderPath: string,
		lastLoadedChatHistoryPath: string | null,
		lastLoadedChatHistory: (string | null)[],
	},
	general: {
		model: string,
		system_role: string,
		max_tokens: string,
		temperature: string,
		enableReferenceCurrentNote: boolean,
	},
	appearance: {
		userName: string,
		chatbotName: string,
		chatbotContainerBackgroundColor: string,
		messageContainerBackgroundColor: string,
		userMessageFontColor: string,
		userMessageBackgroundColor: string,
		botMessageFontColor: string,
		botMessageBackgroundColor: string,
		chatBoxFontColor: string,
		chatBoxBackgroundColor: string,
		enableHeader: boolean,
		enableScrollBar: boolean,
		DocscribeGenerateBackgroundColor: string,
		DocscribeGenerateFontColor: string,
	},
	prompts: {
		prompt: string,
		promptFolderPath: string,
	},
	editor: {
		systen_role: string,
	},
	chatHistory: {
		chatHistoryPath: string,
		templateFilePath: string,
		allowRenameNoteTitle: boolean,
	}
	OllamaConnection: {
		RESTAPIURL: string,
		ollamaParameters: {
			mirostat: string,
			mirostat_eta: string,
			mirostat_tau: string,
			num_ctx: string,
			num_gqa: string,
			num_thread: string,
			repeat_last_n: string,
			repeat_penalty: string,
			seed: string,
			stop: string[],
			tfs_z: string,
			top_k: string,
			top_p: string,
			min_p: string,
			keep_alive: string,
		},
		ollamaModels: string[],
	},
	RESTAPIURLConnection: {
		APIKey: string,
		RESTAPIURL: string,
		RESTAPIURLModels: string[],
	},
	APIConnections: {
		anthropic: {
			APIKey: string,
			anthropicModels: string[],
		},
		googleGemini: {
			APIKey: string,
			geminiModels: string[],
		},
		mistral: {
			APIKey: string,
			mistralModels: string[],
		},
		openAI: {
			APIKey: string,
			openAIBaseUrl: string,
			openAIBaseModels: string[],
		},
		openRouter: {
			APIKey: string,
			openRouterModels: string[],
		},
	},
	toggleGeneralSettings: boolean,
	toggleAppearanceSettings: boolean,
	togglePromptSettings: boolean,
	toggleEditorSettings: boolean,
	toggleChatHistorySettings: boolean,
	toggleProfileSettings: boolean,
	toggleAPIConnectionSettings: boolean,
	toggleOpenAISettings: boolean,
	toggleMistralSettings: boolean,
	toggleGoogleGeminiSettings: boolean,
	toggleAnthropicSettings: boolean,
	toggleRESTAPIURLSettings: boolean,
	toggleOpenRouterSettings: boolean,
	toggleOllamaSettings: boolean,
	toggleAdvancedSettings: boolean,
}

export const DEFAULT_SETTINGS: DocscribeSettings = {
	profiles: {
		profile: 'Docscribe.md',
		profileFolderPath: 'Docscribe/Profiles',
		lastLoadedChatHistoryPath: null,
		lastLoadedChatHistory: [],
	},
	general: {
		model: 'gemini-2.5-pro',
		system_role: 'You are a helpful assistant.',
		max_tokens: '',
		temperature: '1.00',
		enableReferenceCurrentNote: false,
	},
	appearance: {
		userName: 'YOU',
		chatbotName: 'Docscribe',
		chatbotContainerBackgroundColor: '--background-secondary',
		messageContainerBackgroundColor: '--background-secondary',
		userMessageFontColor: '--text-normal',
		userMessageBackgroundColor: '--background-primary',
		botMessageFontColor: '--text-normal',
		botMessageBackgroundColor: '--background-secondary',
		chatBoxFontColor: '--text-normal',
		chatBoxBackgroundColor: '--interactive-accent',
		enableHeader: true,
		enableScrollBar: false,
		DocscribeGenerateBackgroundColor: '#0c0a12',
		DocscribeGenerateFontColor: '--text-normal',
	},
	prompts: {
		prompt: '',
		promptFolderPath: 'Docscribe/Prompts',
	},
	editor: {
		systen_role: 'You are a helpful assistant.',
	},
	chatHistory: {
		chatHistoryPath: 'Docscribe/History',
		templateFilePath: '',
		allowRenameNoteTitle: false,
	},
	OllamaConnection: {
		RESTAPIURL: 'http://localhost:11434',

		ollamaParameters: {
			mirostat: '0',
			mirostat_eta: '0.10',
			mirostat_tau: '5.00',
			num_ctx: '2048',
			num_gqa: '',
			num_thread: '',
			repeat_last_n: '64',
			repeat_penalty: '1.10',
			seed: '',
			stop: [],
			tfs_z: '1.00',
			top_k: '40',
			top_p: '0.90',
			min_p: '0.0',
			keep_alive: '',
		},
		ollamaModels: [],
	},
	RESTAPIURLConnection: {
		APIKey: '',	
		RESTAPIURL: '',

		RESTAPIURLModels: [],
	},
	APIConnections: {
		anthropic: {
			APIKey: '',
			anthropicModels: [],
		},
		googleGemini: {
			APIKey: '',
	
			geminiModels: [],
		},
		mistral: {
			APIKey: '',
	
			mistralModels: [],
		},
		openAI: {
			APIKey: '',
			openAIBaseUrl: 'https://api.openai.com/v1',
	
			openAIBaseModels: [],
		},
		openRouter: {
			APIKey: '',
	
			openRouterModels: [],
		},
	},
	toggleGeneralSettings: true,
	toggleAppearanceSettings: false,
	togglePromptSettings: false,
	toggleEditorSettings: false,
	toggleChatHistorySettings: false,
	toggleProfileSettings: false,
	toggleAPIConnectionSettings: true,
	toggleOpenAISettings: false,
	toggleMistralSettings: false,
	toggleGoogleGeminiSettings: false,
	toggleAnthropicSettings: false,
	toggleRESTAPIURLSettings: true,
	toggleOpenRouterSettings: false,
	toggleOllamaSettings: true,
	toggleAdvancedSettings: false,
}

export let checkActiveFile: TFile | null = null;

export default class DocscribeGPT extends Plugin {
	settings: DocscribeSettings;

	async onload() {
	await this.loadSettings();

		const folderPath = this.settings.profiles.profileFolderPath || DEFAULT_SETTINGS.profiles.profileFolderPath;

		const defaultFilePath = `${folderPath}/${DEFAULT_SETTINGS.profiles.profile}`;
		const defaultProfile = this.app.vault.getAbstractFileByPath(defaultFilePath);
		if (!(defaultProfile instanceof TFile)) {
		console.warn('Default profile is not a valid file:', defaultFilePath);
		return;
		}

		// Check if the folder exists, create it if not
		if (!await this.app.vault.adapter.exists(folderPath)) {
			await this.app.vault.createFolder(folderPath);
		}

		// Check if the 'Default.md' file exists, create it if not
		if (!await this.app.vault.adapter.exists(defaultFilePath)) {
			this.app.vault.create(defaultFilePath, '');
			// console.log('Default profile created.');
		}

		this.registerEvent(
			this.app.vault.on('create', async (file: TFile) => {
			if (file instanceof TFile && file.path.startsWith(folderPath)) {
				const fileContent = await this.app.vault.read(file);
				
				// Check if the file content is empty
				if (fileContent.trim() === '') {
					// File content is empty, proceed with default front matter and appending content
					defaultFrontMatter(this, file);
				}

				// Fetching files from the specified folder (profiles)
				const profileFiles = this.app.vault.getFiles().filter((file) => file.path.startsWith(this.settings.profiles.profileFolderPath));

				// Sorting the files array alphabetically by file name
				profileFiles.sort((a, b) => a.name.localeCompare(b.name));

				if (this.settings.profiles.lastLoadedChatHistory.length === 0) {
					// Ensure each profile has a corresponding element in lastLoadedChatHistory
					profileFiles.forEach((profile, index) => {
						if (!this.settings.profiles.lastLoadedChatHistory[index]) {
						this.settings.profiles.lastLoadedChatHistory[index] = null;
						}
					});
				} else {
					if (this.settings.profiles.lastLoadedChatHistory.length !== profileFiles.length) {
						// Finding the index of the currentProfile in the profileFiles array
						const profileIndex = profileFiles.findIndex((profileFiles) => profileFiles.basename === file.basename);

						this.settings.profiles.lastLoadedChatHistory.splice(profileIndex, 0, null);
					}
				}


		
				await this.saveSettings();
			}
			})
		);

		this.registerEvent(
			this.app.vault.on('delete', async (file: TFile) => {
				// Fetching files from the specified folder (profiles)
				const profileFiles = this.app.vault.getFiles().filter((file) => file.path.startsWith(this.settings.profiles.profileFolderPath));

				// Sorting the files array alphabetically by file name
				profileFiles.sort((a, b) => a.name.localeCompare(b.name));

				if (file instanceof TFile && file.path.startsWith(this.settings.chatHistory.chatHistoryPath)) {
					const currentProfile = this.settings.profiles.profile.replace(/\.[^/.]+$/, ''); // Removing the file extension
					
					// Finding the index of the currentProfile in the profileFiles array
					const profileIndex = profileFiles.findIndex((file) => file.basename === currentProfile);

					const currentIndex = this.settings.profiles.lastLoadedChatHistory.indexOf(file.path);

					if (this.settings.profiles.lastLoadedChatHistory[currentIndex] === file.path) {
						this.settings.profiles.lastLoadedChatHistory[currentIndex] = null;
					}

					if (profileIndex === currentIndex) {
						this.settings.profiles.lastLoadedChatHistoryPath = null;
					}
				}

				if (file instanceof TFile && file.path.startsWith(folderPath)) {
					const filenameMessageHistory = this.app.vault.configDir + '/plugins/docscribe/data/' + 'messageHistory_' + file.name.replace('.md', '.json');
					this.app.vault.adapter.remove(filenameMessageHistory);

					const profileIndex = profileFiles.findIndex((profileFile) => profileFile.name > file.name);

					this.settings.profiles.lastLoadedChatHistory.splice(profileIndex, 1);

					if (file.path === defaultFilePath) {
						this.settings = DEFAULT_SETTINGS;
						this.app.vault.create(defaultFilePath, '');
						await updateSettingsFromFrontMatter(this, defaultProfile);
					}
					else {
						if (this.settings.profiles.profile === file.name) {
							this.settings.profiles.profile = DEFAULT_SETTINGS.profiles.profile;

							// Fetching files from the specified folder (profiles)
							const profileFiles = this.app.vault.getFiles().filter((file) => file.path.startsWith(this.settings.profiles.profileFolderPath));

							// Sorting the files array alphabetically by file name
							profileFiles.sort((a, b) => a.name.localeCompare(b.name));
					
							const currentProfile = this.settings.profiles.profile.replace(/\.[^/.]+$/, ''); // Removing the file extension
					
							// Finding the index of the currentProfile in the profileFiles array
							const profileIndex = profileFiles.findIndex((file) => file.basename === currentProfile);

							if (this.settings.profiles.lastLoadedChatHistoryPath !== null) {
								this.settings.profiles.lastLoadedChatHistoryPath = this.settings.profiles.lastLoadedChatHistory[profileIndex];
							}

							const fileContent = (await this.app.vault.read(defaultProfile)).replace(/^---\s*[\s\S]*?---/, '').trim();
							this.settings.general.system_role = fileContent;
							await updateSettingsFromFrontMatter(this, defaultProfile);
						}
					}
				}
				await this.saveSettings();
			}
		));

		// Update frontmatter when the profile file is modified
		this.registerEvent(
			this.app.vault.on('modify', async (file: TFile) => {
				const currentProfilePath = `${folderPath}/${this.settings.profiles.profile}`;
				if (file.path === currentProfilePath) {
					await updateSettingsFromFrontMatter(this, file);
					const fileContent = (await this.app.vault.read(file)).replace(/^---\s*[\s\S]*?---/, '').trim();
					this.settings.general.system_role = fileContent;
					await this.saveSettings();
				}
			}
		));

		this.registerEvent(
			this.app.vault.on('rename', async (file: TFile, oldPath: string) => {
				try {
					const currentProfilePath = `${folderPath}/${this.settings.profiles.profile}`;
					if (oldPath === currentProfilePath) {
						this.settings.profiles.profile = file.name;
						this.settings.appearance.chatbotName = file.basename;
						await this.saveSettings();
					}

					if (file instanceof TFile && file.path.startsWith(folderPath)) {
						const filenameMessageHistoryPath = this.app.vault.configDir + '/plugins/docscribe/data/';
						const oldProfileMessageHistory = 'messageHistory_' + oldPath.replace(folderPath + '/', '').replace('.md', '.json');
					
						await this.app.vault.adapter.rename(filenameMessageHistoryPath + oldProfileMessageHistory, filenameMessageHistoryPath + 'messageHistory_' + file.name.replace('.md', '.json'))
							.catch((error) => {
								console.error('Error handling rename event:', error);
							});
					
						await this.app.vault.adapter.remove(filenameMessageHistoryPath + oldProfileMessageHistory);
					}
				} catch (error) {
					if (error.message.includes('ENOENT: no such file or directory, unlink')) {
						// Ignore the specific error and do nothing
					} else {
						console.error('Error handling rename event:', error);
					}
				}

				// Fetching files from the specified folder (profiles)
				const profileFiles = this.app.vault.getFiles().filter((file) => file.path.startsWith(this.settings.profiles.profileFolderPath));

				// Sorting the files array alphabetically by file name
				profileFiles.sort((a, b) => a.name.localeCompare(b.name));

				const currentIndex = profileFiles.findIndex((profileFile) => profileFile.path === file.path);

				const prevFileName = oldPath.replace(folderPath + '/', '');

				// Create a new array with prevFileName added
				const updatedProfileFiles = [...profileFiles, { name: prevFileName }];

				// Sort the updated array
				updatedProfileFiles.sort((a, b) => a.name.localeCompare(b.name));

				const fileIndex = updatedProfileFiles.findIndex((profileFile) => profileFile.name === file.name);

				// Remove the currentIndex from the updated array
				if (fileIndex !== -1) {
					updatedProfileFiles.splice(fileIndex, 1);
				}

				const prevIndex = updatedProfileFiles.findIndex((profileFile) => profileFile.name === prevFileName);

				if (currentIndex !== -1) {
					const [removed] = this.settings.profiles.lastLoadedChatHistory.splice(prevIndex, 1);
					this.settings.profiles.lastLoadedChatHistory.splice(currentIndex, 0, removed);
				}

				const currentProfile = this.settings.profiles.profile.replace(/\.[^/.]+$/, ''); // Removing the file extension
					
				// Finding the index of the currentProfile in the profileFiles array
				const profileIndex = profileFiles.findIndex((file) => file.basename === currentProfile);


				// // Find and replace the oldPath with the new path in lastLoadedChatHistory
				const index = this.settings.profiles.lastLoadedChatHistory.indexOf(oldPath);


				if (this.settings.profiles.lastLoadedChatHistory[profileIndex] === oldPath) {
					this.settings.profiles.lastLoadedChatHistory[index] = file.path;
					this.settings.profiles.lastLoadedChatHistoryPath = file.path;
				} else if (this.settings.profiles.lastLoadedChatHistory[index] === oldPath) {
					this.settings.profiles.lastLoadedChatHistory[index] = file.path;
				}

				await this.saveSettings();
			})
		);

        this.registerEvent(
            this.app.workspace.on('active-leaf-change', () => {
                this.handleFileSwitch();
            })
        );

		this.registerView(
			VIEW_TYPE_CHATBOT,
			(leaf) => new DocscribeView(leaf, this.settings, this)
		);

		this.addRibbonIcon('bot', 'Docscribe Chatbot', () => {
			this.activateView();
		});

		this.addCommand({
            id: 'open-docscribe',
            name: 'Open Docscribe chatbot',
            callback: () => {
                this.activateView();
            }
            // hotkeys: [
			// 	{
			// 		modifiers: ['Mod'],
			// 		key: '0',
			// 	},
            // ],
        });

		this.addCommand({
            id: 'rename-note-title',
            name: 'Rename note title',
            callback: () => {
				renameTitleCommand(this, this.settings);
            }
            // hotkeys: [
			// 	{
			// 		modifiers: ['Mod'],
			// 		key: '\'',
			// 	},
            // ],
        });

		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				if (!(file instanceof TFile)) {
					return;
				}

				if (file.extension === 'pptx') {
					menu.addItem((item) => {
						item
							.setTitle('Docscribe: Extract notes from pptx')
							.onClick(async () => {
								const arrayBuffer = await this.app.vault.readBinary(file);
								const extractedText = await extractStructuredText(arrayBuffer);
								const prompt = "Please output the topics from the following text in well-formatted markdown:\n\n" + extractedText;
								await this.activateView();
								const view = this.app.workspace.getLeavesOfType(VIEW_TYPE_CHATBOT)[0].view as DocscribeView;
								view.sendSystemMessage(prompt);
							});
					});
				}

				if (file.extension === 'pdf') {
					menu.addItem((item) => {
						item
							.setTitle('Docscribe: Extract notes from pdf')
							.onClick(async () => {
								const arrayBuffer = await this.app.vault.readBinary(file);
								const extractedText = await extractTextFromPdf(arrayBuffer, 5000);
								const prompt = "Please summarize the following text in well-formatted markdown:\n\n" + extractedText;
								await this.activateView();
								const view = this.app.workspace.getLeavesOfType(VIEW_TYPE_CHATBOT)[0].view as DocscribeView;
								view.sendSystemMessage(prompt);
							});
					});
				}
	
				menu.addItem((item) => {
					item
						.setTitle('Docscribe: Generate new title')
						.onClick(() => renameTitleCommand(this, this.settings));
				});
			})
		);

		this.addCommand({
            id: 'prompt-select-generate',
            name: 'Prompt select generate',
            callback: () => {
				promptSelectGenerateCommand(this, this.settings);
            }
            // hotkeys: [
			// 	{
			// 		modifiers: ['Mod', 'Shift'],
			// 		key: '=',
			// 	},
            // ],
        });

		// Register Docscribe code block processor
		DocscribeCodeBlockProcessor(this, this.settings);

		this.addSettingTab(new DocscribeSettingTab(this.app, this));
	}

	handleFileSwitch() {
		checkActiveFile = this.app.workspace.getActiveFile();
	}

	async onunload() {
		this.app.workspace.getLeavesOfType(VIEW_TYPE_CHATBOT).forEach((leaf) => {
			const DocscribeView = leaf.view as DocscribeView;
	
			if (DocscribeView) {
				this.saveSettings();
			}
			
		});
		
	}

	async activateView() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_CHATBOT);
	
		const rightLeaf = this.app.workspace.getRightLeaf(false);
		await rightLeaf?.setViewState({
				type: VIEW_TYPE_CHATBOT,
				active: true,
			});

		this.app.workspace.revealLeaf(
			this.app.workspace.getLeavesOfType(VIEW_TYPE_CHATBOT)[0]
		);
	
		// Focus on the textarea
		const textarea = document.querySelector('.chatbox textarea') as HTMLTextAreaElement;
	
		if (textarea) {
			textarea.classList.add('fade-in');
	
			setTimeout(() => {
				textarea.focus();
				textarea.style.opacity = '1';
			}, 50);
		}
	
		this.app.workspace.revealLeaf(
			this.app.workspace.getLeavesOfType(VIEW_TYPE_CHATBOT)[0]
		);
	
		const messageContainer = document.querySelector('#messageContainer');
		if (messageContainer) {
			messageContainer.scroll({
				top: messageContainer.scrollHeight, 
				behavior: 'smooth' 
			});
		}
	}
	

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		const currentProfileFile = `${this.settings.profiles.profileFolderPath}/${this.settings.profiles.profile}`
		const currentProfile = this.app.vault.getAbstractFileByPath(currentProfileFile);
		if (!(currentProfile instanceof TFile)) {
		console.warn('Current profile is not a valid file:', currentProfileFile);
		return;
		}
		updateFrontMatter(this, currentProfile);

		// Update the model dropdown in the header
		const header = document.querySelector('#header') as HTMLElement;
		const modelOptions = header?.querySelector('#modelOptions');
			if (modelOptions) {
				modelOptions.remove();
			}
			const populateModelOptions = populateModelDropdown(this, this.settings);
		header?.appendChild(populateModelOptions);

		// Save the settings
		await this.saveData(this.settings);
	}
}

export async function defaultFrontMatter(plugin: DocscribeGPT, file: TFile) {
    // Define a callback function to modify the frontmatter
    const setDefaultFrontMatter = async (frontmatter: any) => {
        // Add or modify properties in the frontmatter
        frontmatter.model = DEFAULT_SETTINGS.general.model;
        frontmatter.max_tokens = parseInt(DEFAULT_SETTINGS.general.max_tokens);
        frontmatter.temperature = parseFloat(DEFAULT_SETTINGS.general.temperature);
        frontmatter.enable_reference_current_note = DEFAULT_SETTINGS.general.enableReferenceCurrentNote;
		frontmatter.prompt = DEFAULT_SETTINGS.prompts.prompt;
		frontmatter.user_name = DEFAULT_SETTINGS.appearance.userName;
		// frontmatter.chatbot_name = DEFAULT_SETTINGS.appearance.chatbotName;
		frontmatter.enable_header = DEFAULT_SETTINGS.appearance.enableHeader;
		frontmatter.chatbot_container_background_color = DEFAULT_SETTINGS.appearance.chatbotContainerBackgroundColor.replace(/^#/, '');
		frontmatter.message_container_background_color = DEFAULT_SETTINGS.appearance.messageContainerBackgroundColor.replace(/^#/, '');
		frontmatter.user_message_font_color = DEFAULT_SETTINGS.appearance.userMessageFontColor.replace(/^#/, '');
		frontmatter.user_message_background_color = DEFAULT_SETTINGS.appearance.userMessageBackgroundColor.replace(/^#/, '');
		frontmatter.bot_message_font_color = DEFAULT_SETTINGS.appearance.botMessageFontColor.replace(/^#/, '');
		frontmatter.chatbot_message_background_color = DEFAULT_SETTINGS.appearance.botMessageBackgroundColor.replace(/^#/, '');
		frontmatter.chatbox_font_color = DEFAULT_SETTINGS.appearance.chatBoxFontColor.replace(/^#/, '');
		frontmatter.chatbox_background_color = DEFAULT_SETTINGS.appearance.chatBoxBackgroundColor.replace(/^#/, '');
		frontmatter.Docscribe_generate_background_color = DEFAULT_SETTINGS.appearance.DocscribeGenerateBackgroundColor.replace(/^#/, '');
		frontmatter.Docscribe_generate_font_color = DEFAULT_SETTINGS.appearance.DocscribeGenerateFontColor.replace(/^#/, '');
		frontmatter.systen_role = DEFAULT_SETTINGS.editor.systen_role;
		frontmatter.ollama_mirostat = parseFloat(DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.mirostat);
		frontmatter.ollama_mirostat_eta = parseFloat(DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.mirostat_eta);
		frontmatter.ollama_mirostat_tau = parseFloat(DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.mirostat_tau);
		frontmatter.ollama_num_ctx = parseInt(DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.num_ctx);
		frontmatter.ollama_num_gqa = parseInt(DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.num_gqa);
		frontmatter.ollama_num_thread = parseInt(DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.num_thread);
		frontmatter.ollama_repeat_last_n = parseInt(DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.repeat_last_n);
		frontmatter.ollama_repeat_penalty = parseFloat(DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.repeat_penalty);
		frontmatter.ollama_seed = parseInt(DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.seed);
		frontmatter.ollama_stop = DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.stop;
		frontmatter.ollama_tfs_z = parseFloat(DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.tfs_z);
		frontmatter.ollama_top_k = parseInt(DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.top_k);
		frontmatter.ollama_top_p = parseFloat(DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.top_p);
		frontmatter.ollama_min_p = parseFloat(DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.min_p);
		frontmatter.ollama_keep_alive = DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.keep_alive;
    };

    // Optional: Specify data write options
    const writeOptions: DataWriteOptions = {
        // Specify options if needed
    };

    try {
        await plugin.app.fileManager.processFrontMatter(file, setDefaultFrontMatter, writeOptions);
    }
    catch (error) {
        console.error('Error processing frontmatter:', error);
    }

	plugin.app.vault.append(file, DEFAULT_SETTINGS.general.system_role);
}

export async function updateSettingsFromFrontMatter(plugin: DocscribeGPT, file: TFile){
    // Define a callback function to modify the frontmatter
    const updateSettings = async (frontmatter: any) => {
        // Add or modify properties in the frontmatter
        plugin.settings.general.model = frontmatter.model;
		plugin.settings.general.max_tokens = frontmatter.max_tokens;
		plugin.settings.general.temperature = frontmatter.temperature;
		plugin.settings.general.enableReferenceCurrentNote = frontmatter.enable_reference_current_note;
		plugin.settings.prompts.prompt = frontmatter.prompt;
		plugin.settings.appearance.userName = frontmatter.user_name;
		plugin.settings.appearance.chatbotName = file.basename;
		plugin.settings.appearance.enableHeader = frontmatter.enable_header;
		plugin.settings.appearance.chatbotContainerBackgroundColor = '#' + frontmatter.chatbot_container_background_color;
		plugin.settings.appearance.messageContainerBackgroundColor = '#' + frontmatter.message_container_background_color;
		plugin.settings.appearance.userMessageFontColor = '#' + frontmatter.user_message_font_color;
		plugin.settings.appearance.userMessageBackgroundColor = '#' + frontmatter.user_message_background_color;
		plugin.settings.appearance.botMessageFontColor = '#' + frontmatter.bot_message_font_color;
		plugin.settings.appearance.botMessageBackgroundColor = '#' + frontmatter.chatbot_message_background_color;
		plugin.settings.appearance.chatBoxFontColor = '#' + frontmatter.chatbox_font_color;
		plugin.settings.appearance.chatBoxBackgroundColor = '#' + frontmatter.chatbox_background_color;
		plugin.settings.appearance.DocscribeGenerateBackgroundColor = '#' + frontmatter.Docscribe_generate_background_color;
		plugin.settings.appearance.DocscribeGenerateFontColor = '#' + frontmatter.Docscribe_generate_font_color;
		plugin.settings.editor.systen_role = frontmatter.systen_role;
		plugin.settings.OllamaConnection.ollamaParameters.mirostat = frontmatter.ollama_mirostat;
		plugin.settings.OllamaConnection.ollamaParameters.mirostat_eta = frontmatter.ollama_mirostat_eta;
		plugin.settings.OllamaConnection.ollamaParameters.mirostat_tau = frontmatter.ollama_mirostat_tau;
		plugin.settings.OllamaConnection.ollamaParameters.num_ctx = frontmatter.ollama_num_ctx;
		plugin.settings.OllamaConnection.ollamaParameters.num_gqa = frontmatter.ollama_num_gqa;
		plugin.settings.OllamaConnection.ollamaParameters.num_thread = frontmatter.ollama_num_thread;
		plugin.settings.OllamaConnection.ollamaParameters.repeat_last_n = frontmatter.ollama_repeat_last_n;
		plugin.settings.OllamaConnection.ollamaParameters.repeat_penalty = frontmatter.ollama_repeat_penalty;
		plugin.settings.OllamaConnection.ollamaParameters.seed = frontmatter.ollama_seed;
		plugin.settings.OllamaConnection.ollamaParameters.stop = frontmatter.ollama_stop;
		plugin.settings.OllamaConnection.ollamaParameters.tfs_z = frontmatter.ollama_tfs_z;
		plugin.settings.OllamaConnection.ollamaParameters.top_k = frontmatter.ollama_top_k;
		plugin.settings.OllamaConnection.ollamaParameters.top_p = frontmatter.ollama_top_p;
		plugin.settings.OllamaConnection.ollamaParameters.min_p = frontmatter.ollama_min_p;
		plugin.settings.OllamaConnection.ollamaParameters.keep_alive = frontmatter.ollama_keep_alive;
    };

    // Optional: Specify data write options
    const writeOptions: DataWriteOptions = {
        // Specify options if needed
    };

    try {
        await plugin.app.fileManager.processFrontMatter(file, updateSettings, writeOptions);
		const fileContent = (await plugin.app.vault.read(file)).replace(/^---\s*[\s\S]*?---/, '').trim();
		plugin.settings.general.system_role = fileContent;
		updateProfile(plugin, file);
    }
    catch (error) {
        console.error('Error processing frontmatter:', error);
    }
}

export async function updateFrontMatter(plugin: DocscribeGPT, file: TFile){
    // Define a callback function to modify the frontmatter
    const modifyFrontMatter = async (frontmatter: any) => {
        // Add or modify properties in the frontmatter
        frontmatter.model = plugin.settings.general.model;
        frontmatter.max_tokens = parseInt(plugin.settings.general.max_tokens);
        frontmatter.temperature = parseFloat(plugin.settings.general.temperature);
        frontmatter.enable_reference_current_note = plugin.settings.general.enableReferenceCurrentNote;
		frontmatter.prompt = plugin.settings.prompts.prompt.replace('.md', '');
		frontmatter.user_name = plugin.settings.appearance.userName;
		// frontmatter.chatbot_name = plugin.settings.appearance.chatbotName;
		frontmatter.enable_header = plugin.settings.appearance.enableHeader;
		frontmatter.chatbot_container_background_color = plugin.settings.appearance.chatbotContainerBackgroundColor.replace(/^#/, '');
		frontmatter.message_container_background_color = plugin.settings.appearance.messageContainerBackgroundColor.replace(/^#/, '');
		frontmatter.user_message_font_color = plugin.settings.appearance.userMessageFontColor.replace(/^#/, '');
		frontmatter.user_message_background_color = plugin.settings.appearance.userMessageBackgroundColor.replace(/^#/, '');
		frontmatter.bot_message_font_color = plugin.settings.appearance.botMessageFontColor.replace(/^#/, '');
		frontmatter.chatbot_message_background_color = plugin.settings.appearance.botMessageBackgroundColor.replace(/^#/, '');
		frontmatter.chatbox_font_color = plugin.settings.appearance.chatBoxFontColor.replace(/^#/, '');
		frontmatter.chatbox_background_color = plugin.settings.appearance.chatBoxBackgroundColor.replace(/^#/, '');
		frontmatter.Docscribe_generate_background_color = plugin.settings.appearance.DocscribeGenerateBackgroundColor.replace(/^#/, '');
		frontmatter.Docscribe_generate_font_color = plugin.settings.appearance.DocscribeGenerateFontColor.replace(/^#/, '');
		frontmatter.systen_role = plugin.settings.editor.systen_role;
		frontmatter.ollama_mirostat = parseFloat(plugin.settings.OllamaConnection.ollamaParameters.mirostat);
		frontmatter.ollama_mirostat_eta = parseFloat(plugin.settings.OllamaConnection.ollamaParameters.mirostat_eta);
		frontmatter.ollama_mirostat_tau = parseFloat(plugin.settings.OllamaConnection.ollamaParameters.mirostat_tau);
		frontmatter.ollama_num_ctx = parseInt(plugin.settings.OllamaConnection.ollamaParameters.num_ctx);
		frontmatter.ollama_num_gqa = parseInt(plugin.settings.OllamaConnection.ollamaParameters.num_gqa);
		frontmatter.ollama_num_thread = parseInt(plugin.settings.OllamaConnection.ollamaParameters.num_thread);
		frontmatter.ollama_repeat_last_n = parseInt(plugin.settings.OllamaConnection.ollamaParameters.repeat_last_n);
		frontmatter.ollama_repeat_penalty = parseFloat(plugin.settings.OllamaConnection.ollamaParameters.repeat_penalty);
		frontmatter.ollama_seed = parseInt(plugin.settings.OllamaConnection.ollamaParameters.seed);
		frontmatter.ollama_stop = plugin.settings.OllamaConnection.ollamaParameters.stop;
		frontmatter.ollama_tfs_z = parseFloat(plugin.settings.OllamaConnection.ollamaParameters.tfs_z);
		frontmatter.ollama_top_k = parseInt(plugin.settings.OllamaConnection.ollamaParameters.top_k);
		frontmatter.ollama_top_p = parseFloat(plugin.settings.OllamaConnection.ollamaParameters.top_p);
		frontmatter.ollama_min_p = parseFloat(plugin.settings.OllamaConnection.ollamaParameters.min_p);
		frontmatter.ollama_keep_alive = plugin.settings.OllamaConnection.ollamaParameters.keep_alive;
    };

    // Optional: Specify data write options
    const writeOptions: DataWriteOptions = {
        // Specify options if needed
    };

    try {
        await plugin.app.fileManager.processFrontMatter(file, modifyFrontMatter, writeOptions);
		updateProfile(plugin, file);
    }
    catch (error) {
        console.error('Error processing frontmatter:', error);
    }
}

export async function updateProfile(plugin: DocscribeGPT, file: TFile) {
	try {
		await plugin.app.fileManager.processFrontMatter(
			file,
			(frontmatter: any) => {
				plugin.settings.general.model =
					frontmatter.model || DEFAULT_SETTINGS.general.model;

				if (frontmatter.max_tokens) {
					plugin.settings.general.max_tokens =
						frontmatter.max_tokens.toString();

					frontmatter.max_tokens = parseInt(
						plugin.settings.general.max_tokens
					);
				} else {
					plugin.settings.general.max_tokens =
						DEFAULT_SETTINGS.general.max_tokens;
				}

				if (frontmatter.temperature) {
					if (frontmatter.temperature < 0) {
						frontmatter.temperature = "0.00";
					} else if (frontmatter.temperature > 2) {
						frontmatter.temperature = "2.00";
					} else {
						plugin.settings.general.temperature = parseFloat(
							frontmatter.temperature
						)
							.toFixed(2)
							.toString();

						frontmatter.temperature = parseFloat(
							plugin.settings.general.temperature
						);
					}
				} else {
					plugin.settings.general.temperature =
						DEFAULT_SETTINGS.general.temperature;

					frontmatter.temperature =
						DEFAULT_SETTINGS.general.temperature;
				}

				plugin.settings.general.enableReferenceCurrentNote =
					frontmatter.enable_reference_current_note;

				const referenceCurrentNoteElement = document.getElementById(
					"referenceCurrentNote"
				) as HTMLElement;

				if (referenceCurrentNoteElement) {
					referenceCurrentNoteElement.classList.remove(
						"visible",
						"hidden"
					);
					if (frontmatter.enable_reference_current_note === true) {
						referenceCurrentNoteElement.classList.add("visible");
					} else {
						referenceCurrentNoteElement.classList.add("hidden");
					}
				}

				if (frontmatter.prompt && frontmatter.prompt !== "") {
					plugin.settings.prompts.prompt = frontmatter.prompt + ".md";
				} else {
					plugin.settings.prompts.prompt =
						DEFAULT_SETTINGS.prompts.prompt;
				}

				if (frontmatter.user_name) {
					plugin.settings.appearance.userName =
						frontmatter.user_name.substring(0, 30);
				} else {
					plugin.settings.appearance.userName =
						DEFAULT_SETTINGS.appearance.userName;
				}

				frontmatter.user_name = plugin.settings.appearance.userName;

				const userNames = document.querySelectorAll(
					".userName"
				) as NodeListOf<HTMLHeadingElement>;

				userNames.forEach((userName) => {
					userName.textContent = plugin.settings.appearance.userName;
				});

				// if (frontmatter.chatbot_name) {

				// plugin.settings.appearance.chatbotName = frontmatter.chatbot_name.toUpperCase().substring(0, 30);

				// } else {

				// 	plugin.settings.appearance.chatbotName = DEFAULT_SETTINGS.appearance.chatbotName;

				// }

				// frontmatter.chatbot_name = plugin.settings.appearance.chatbotName;

				const chatbotNameHeading = document.querySelector(
					"#chatbotNameHeading"
				) as HTMLHeadingElement;

				const chatbotNames = document.querySelectorAll(
					".chatbotName"
				) as NodeListOf<HTMLHeadingElement>;

				if (chatbotNameHeading) {
					chatbotNameHeading.textContent =
						plugin.settings.appearance.chatbotName;
				}

				chatbotNames.forEach((chatbotName) => {
					chatbotName.textContent =
						plugin.settings.appearance.chatbotName;
				});

				updateStyles(frontmatter, plugin.settings);

				plugin.settings.editor.systen_role = frontmatter.systen_role;

				plugin.settings.appearance.enableHeader =
					frontmatter.enable_header;

				if (frontmatter.enable_header === true) {
					const header = document.querySelector(
						"#header"
					) as HTMLElement;

					if (header) {
						header.style.display = "block";

						referenceCurrentNoteElement.style.margin =
							"-0.5rem 0 0.5rem 0";
					}
				} else {
					const header = document.querySelector(
						"#header"
					) as HTMLElement;

					const messageContainer = document.querySelector(
						"#messageContainer"
					) as HTMLElement;

					if (header) {
						header.style.display = "none";

						messageContainer.style.maxHeight = "calc(100% - 60px)";

						referenceCurrentNoteElement.style.margin =
							"0.5rem 0 0.5rem 0";
					}
				}

				const intValue = parseInt(frontmatter.ollama_mirostat, 10); // 10 is the radix parameter to ensure parsing is done in base 10

				// Check if the parsed value is a valid integer, if not, fallback to the default URL

				if (isNaN(intValue)) {
					plugin.settings.OllamaConnection.ollamaParameters.mirostat =
						DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.mirostat;

					frontmatter.ollama_mirostat =
						plugin.settings.OllamaConnection.ollamaParameters.mirostat;
				} else {
					plugin.settings.OllamaConnection.ollamaParameters.mirostat =
						intValue.toString();

					frontmatter.ollama_mirostat = intValue;
				}

				if (isNaN(parseFloat(frontmatter.ollama_mirostat_eta))) {
					plugin.settings.OllamaConnection.ollamaParameters.mirostat_eta =
						DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.mirostat_eta;

					frontmatter.ollama_mirostat_eta =
						plugin.settings.OllamaConnection.ollamaParameters.mirostat_eta;
				} else {
					plugin.settings.OllamaConnection.ollamaParameters.mirostat_eta =
						parseFloat(frontmatter.ollama_mirostat_eta)
							.toFixed(2)
							.toString();

					frontmatter.ollama_mirostat_eta = parseFloat(
						plugin.settings.OllamaConnection.ollamaParameters
							.mirostat_eta
					);
				}

				if (isNaN(parseFloat(frontmatter.ollama_mirostat_tau))) {
					plugin.settings.OllamaConnection.ollamaParameters.mirostat_tau =
						DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.mirostat_tau;

					frontmatter.ollama_mirostat_tau =
						plugin.settings.OllamaConnection.ollamaParameters.mirostat_tau;
				} else {
					plugin.settings.OllamaConnection.ollamaParameters.mirostat_tau =
						parseFloat(frontmatter.ollama_mirostat_tau)
							.toFixed(2)
							.toString();

					frontmatter.ollama_mirostat_tau = parseFloat(
						plugin.settings.OllamaConnection.ollamaParameters
							.mirostat_tau
					);
				}

				if (isNaN(parseInt(frontmatter.ollama_num_ctx))) {
					plugin.settings.OllamaConnection.ollamaParameters.num_ctx =
						DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.num_ctx;

					frontmatter.ollama_num_ctx =
						plugin.settings.OllamaConnection.ollamaParameters.num_ctx;
				} else {
					plugin.settings.OllamaConnection.ollamaParameters.num_ctx =
						parseInt(frontmatter.ollama_num_ctx).toString();

					frontmatter.ollama_num_ctx = parseInt(
						plugin.settings.OllamaConnection.ollamaParameters
							.num_ctx
					);
				}

				if (isNaN(parseInt(frontmatter.ollama_num_gqa))) {
					plugin.settings.OllamaConnection.ollamaParameters.num_gqa =
						DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.num_gqa;
				} else {
					plugin.settings.OllamaConnection.ollamaParameters.num_gqa =
						parseInt(frontmatter.ollama_num_gqa).toString();

					frontmatter.ollama_num_gqa = parseInt(
						plugin.settings.OllamaConnection.ollamaParameters
							.num_gqa
					);
				}

				if (isNaN(parseInt(frontmatter.ollama_num_thread))) {
					plugin.settings.OllamaConnection.ollamaParameters.num_thread =
						DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.num_thread;
				} else {
					plugin.settings.OllamaConnection.ollamaParameters.num_thread =
						parseInt(frontmatter.ollama_num_thread).toString();

					frontmatter.ollama_num_thread = parseInt(
						plugin.settings.OllamaConnection.ollamaParameters
							.num_thread
					);
				}

				if (isNaN(parseInt(frontmatter.ollama_repeat_last_n))) {
					plugin.settings.OllamaConnection.ollamaParameters.repeat_last_n =
						DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.repeat_last_n;

					frontmatter.ollama_repeat_last_n =
						plugin.settings.OllamaConnection.ollamaParameters.repeat_last_n;
				} else {
					plugin.settings.OllamaConnection.ollamaParameters.repeat_last_n =
						parseInt(frontmatter.ollama_repeat_last_n).toString();

					frontmatter.ollama_repeat_last_n = parseInt(
						plugin.settings.OllamaConnection.ollamaParameters
							.repeat_last_n
					);
				}

				if (isNaN(parseFloat(frontmatter.ollama_repeat_penalty))) {
					plugin.settings.OllamaConnection.ollamaParameters.repeat_penalty =
						DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.repeat_penalty;

					frontmatter.ollama_repeat_penalty =
						plugin.settings.OllamaConnection.ollamaParameters.repeat_penalty;
				} else {
					plugin.settings.OllamaConnection.ollamaParameters.repeat_penalty =
						parseFloat(frontmatter.ollama_repeat_penalty)
							.toFixed(2)
							.toString();

					frontmatter.ollama_repeat_penalty = parseFloat(
						plugin.settings.OllamaConnection.ollamaParameters
							.repeat_penalty
					);
				}

				if (isNaN(parseInt(frontmatter.ollama_seed))) {
					plugin.settings.OllamaConnection.ollamaParameters.seed =
						DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.seed;
				} else {
					plugin.settings.OllamaConnection.ollamaParameters.seed =
						parseInt(frontmatter.ollama_seed).toString();

					frontmatter.ollama_seed = parseInt(
						plugin.settings.OllamaConnection.ollamaParameters.seed
					);
				}

				plugin.settings.OllamaConnection.ollamaParameters.stop =
					frontmatter.ollama_stop;

				if (isNaN(parseFloat(frontmatter.ollama_tfs_z))) {
					plugin.settings.OllamaConnection.ollamaParameters.tfs_z =
						DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.tfs_z;

					frontmatter.ollama_tfs_z =
						plugin.settings.OllamaConnection.ollamaParameters.tfs_z;
				} else {
					plugin.settings.OllamaConnection.ollamaParameters.tfs_z =
						parseFloat(frontmatter.ollama_tfs_z)
							.toFixed(2)
							.toString();

					frontmatter.ollama_tfs_z = parseFloat(
						plugin.settings.OllamaConnection.ollamaParameters.tfs_z
					);
				}

				if (isNaN(parseInt(frontmatter.ollama_top_k))) {
					plugin.settings.OllamaConnection.ollamaParameters.top_k =
						DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.top_k;

					frontmatter.ollama_top_k =
						plugin.settings.OllamaConnection.ollamaParameters.top_k;
				} else {
					plugin.settings.OllamaConnection.ollamaParameters.top_k =
						parseInt(frontmatter.ollama_top_k).toString();

					frontmatter.ollama_top_k = parseInt(
						plugin.settings.OllamaConnection.ollamaParameters.top_k
					);
				}

				if (isNaN(parseInt(frontmatter.ollama_top_p))) {
					plugin.settings.OllamaConnection.ollamaParameters.top_p =
						DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.top_p;

					frontmatter.ollama_top_p =
						plugin.settings.OllamaConnection.ollamaParameters.top_p;
				} else {
					plugin.settings.OllamaConnection.ollamaParameters.top_p =
						parseFloat(frontmatter.ollama_top_p)
							.toFixed(2)
							.toString();

					frontmatter.ollama_top_p = parseFloat(
						plugin.settings.OllamaConnection.ollamaParameters.top_p
					);
				}

				if (isNaN(parseInt(frontmatter.ollama_min_p))) {
					plugin.settings.OllamaConnection.ollamaParameters.min_p =
						DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.min_p;

					frontmatter.ollama_min_p =
						plugin.settings.OllamaConnection.ollamaParameters.min_p;
				} else {
					plugin.settings.OllamaConnection.ollamaParameters.min_p =
						parseFloat(frontmatter.ollama_min_p)
							.toFixed(2)
							.toString();

					frontmatter.ollama_min_p = parseFloat(
						plugin.settings.OllamaConnection.ollamaParameters.min_p
					);
				}

				// Regular expression to validate the input value and capture the number and unit

				const match = String(frontmatter.ollama_keep_alive).match(
					/^(-?\d+)(m|hr|h)?$/
				);

				if (match) {
					const num = parseInt(match[1]);

					const unit = match[2];

					// Convert to seconds based on the unit

					let seconds;

					if (unit === "m") {
						seconds = num * 60; // Convert minutes to seconds
					} else if (unit === "hr" || unit === "h") {
						seconds = num * 3600; // Convert hours to seconds
					} else {
						seconds = num; // Assume it's already in seconds if no unit
					}

					// Store the value in seconds

					plugin.settings.OllamaConnection.ollamaParameters.keep_alive =
						seconds.toString();

					frontmatter.ollama_keep_alive =
						plugin.settings.OllamaConnection.ollamaParameters.keep_alive;
				} else {
					// If the input is invalid, revert to the default setting

					plugin.settings.OllamaConnection.ollamaParameters.keep_alive =
						DEFAULT_SETTINGS.OllamaConnection.ollamaParameters.keep_alive;

					frontmatter.ollama_keep_alive =
						plugin.settings.OllamaConnection.ollamaParameters.keep_alive;
				}
			}
		);
	} catch (error) {
		console.error("Error processing frontmatter:", error);
	}
}



function updateStyles(frontmatter: any, settings: DocscribeSettings) {
	const root = document.documentElement;

	if (isValidHexColor(frontmatter.chatbot_container_background_color)) {
		settings.appearance.chatbotContainerBackgroundColor =
			"#" +
			frontmatter.chatbot_container_background_color.substring(0, 6);

		root.style.setProperty(
			"--docscribe-chatbot-container-background-color",
			settings.appearance.chatbotContainerBackgroundColor
		);
	} else {
		settings.appearance.chatbotContainerBackgroundColor = colorToHex(
			DEFAULT_SETTINGS.appearance.chatbotContainerBackgroundColor
		);

		frontmatter.chatbot_container_background_color =
			settings.appearance.chatbotContainerBackgroundColor.replace(
				/^#/,
				""
			);

		root.style.setProperty(
			"--docscribe-chatbot-container-background-color",
			colorToHex(
				DEFAULT_SETTINGS.appearance.chatbotContainerBackgroundColor
			)
		);
	}

	if (isValidHexColor(frontmatter.message_container_background_color)) {
		settings.appearance.messageContainerBackgroundColor =
			"#" +
			frontmatter.message_container_background_color.substring(0, 6);

		root.style.setProperty(
			"--docscribe-message-container-background-color",
			settings.appearance.messageContainerBackgroundColor
		);
	} else {
		settings.appearance.messageContainerBackgroundColor = colorToHex(
			DEFAULT_SETTINGS.appearance.messageContainerBackgroundColor
		);

		frontmatter.message_container_background_color =
			settings.appearance.messageContainerBackgroundColor.replace(
				/^#/,
				""
			);

		root.style.setProperty(
			"--docscribe-message-container-background-color",
			colorToHex(
				DEFAULT_SETTINGS.appearance.messageContainerBackgroundColor
			)
		);
	}

	if (isValidHexColor(frontmatter.user_message_font_color)) {
		settings.appearance.userMessageFontColor =
			"#" + frontmatter.user_message_font_color.substring(0, 6);

		root.style.setProperty(
			"--docscribe-user-message-font-color",
			settings.appearance.userMessageFontColor
		);
	} else {
		settings.appearance.userMessageFontColor = colorToHex(
			DEFAULT_SETTINGS.appearance.userMessageFontColor
		);

		frontmatter.user_message_font_color =
			settings.appearance.userMessageFontColor.replace(/^#/, "");

		root.style.setProperty(
			"--docscribe-user-message-font-color",
			colorToHex(DEFAULT_SETTINGS.appearance.userMessageFontColor)
		);
	}

	if (isValidHexColor(frontmatter.user_message_background_color)) {
		settings.appearance.userMessageBackgroundColor =
			"#" + frontmatter.user_message_background_color.substring(0, 6);

		root.style.setProperty(
			"--docscribe-user-message-background-color",
			settings.appearance.userMessageBackgroundColor
		);
	} else {
		settings.appearance.userMessageBackgroundColor = colorToHex(
			DEFAULT_SETTINGS.appearance.userMessageBackgroundColor
		);

		frontmatter.user_message_background_color =
			settings.appearance.userMessageBackgroundColor.replace(/^#/, "");

		root.style.setProperty(
			"--docscribe-user-message-background-color",
			colorToHex(DEFAULT_SETTINGS.appearance.userMessageBackgroundColor)
		);
	}

	if (isValidHexColor(frontmatter.bot_message_font_color)) {
		settings.appearance.botMessageFontColor =
			"#" + frontmatter.bot_message_font_color.substring(0, 6);

		root.style.setProperty(
			"--docscribe-bot-message-font-color",
			settings.appearance.botMessageFontColor
		);
	} else {
		settings.appearance.botMessageFontColor = colorToHex(
			DEFAULT_SETTINGS.appearance.botMessageFontColor
		);

		frontmatter.bot_message_font_color =
			settings.appearance.botMessageFontColor.replace(/^#/, "");

		root.style.setProperty(
			"--docscribe-bot-message-font-color",
			colorToHex(DEFAULT_SETTINGS.appearance.botMessageFontColor)
		);
	}

	if (isValidHexColor(frontmatter.chatbot_message_background_color)) {
		settings.appearance.botMessageBackgroundColor =
			"#" + frontmatter.chatbot_message_background_color.substring(0, 6);

		root.style.setProperty(
			"--docscribe-bot-message-background-color",
			settings.appearance.botMessageBackgroundColor
		);
	} else {
		settings.appearance.botMessageBackgroundColor = colorToHex(
			DEFAULT_SETTINGS.appearance.botMessageBackgroundColor
		);

		frontmatter.chatbot_message_background_color =
			settings.appearance.botMessageBackgroundColor.replace(/^#/, "");

		root.style.setProperty(
			"--docscribe-bot-message-background-color",
			colorToHex(DEFAULT_SETTINGS.appearance.botMessageBackgroundColor)
		);
	}

	if (isValidHexColor(frontmatter.chatbox_font_color)) {
		settings.appearance.chatBoxFontColor =
			"#" + frontmatter.chatbox_font_color.substring(0, 6);

		root.style.setProperty(
			"--docscribe-chatbox-font-color",
			settings.appearance.chatBoxFontColor
		);
	} else {
		settings.appearance.chatBoxFontColor = colorToHex(
			DEFAULT_SETTINGS.appearance.chatBoxFontColor
		);

		frontmatter.chatbox_font_color =
			settings.appearance.chatBoxFontColor.replace(/^#/, "");

		root.style.setProperty(
			"--docscribe-chatbox-font-color",
			colorToHex(DEFAULT_SETTINGS.appearance.chatBoxFontColor)
		);
	}

	if (isValidHexColor(frontmatter.chatbox_background_color)) {
		settings.appearance.chatBoxBackgroundColor =
			"#" + frontmatter.chatbox_background_color.substring(0, 6);

		root.style.setProperty(
			"--docscribe-chatbox-background-color",
			settings.appearance.chatBoxBackgroundColor
		);
	} else {
		settings.appearance.chatBoxBackgroundColor =
			DEFAULT_SETTINGS.appearance.chatBoxBackgroundColor;

		frontmatter.chatbox_background_color =
			DEFAULT_SETTINGS.appearance.chatBoxBackgroundColor.replace(
				/^#/,
				""
			);

		root.style.setProperty(
			"--docscribe-chatbox-background-color",
			colorToHex(DEFAULT_SETTINGS.appearance.chatBoxBackgroundColor)
		);
	}

	if (isValidHexColor(frontmatter.Docscribe_generate_background_color)) {
		settings.appearance.DocscribeGenerateBackgroundColor =
			"#" +
			frontmatter.Docscribe_generate_background_color.substring(0, 6);

		root.style.setProperty(
			"--docscribe-generate-background-color",
			settings.appearance.DocscribeGenerateBackgroundColor
		);
	} else {
		settings.appearance.DocscribeGenerateBackgroundColor = colorToHex(
			DEFAULT_SETTINGS.appearance.DocscribeGenerateBackgroundColor
		);

		frontmatter.Docscribe_generate_background_color =
			settings.appearance.DocscribeGenerateBackgroundColor.replace(
				/^#/,
				""
			);

		root.style.setProperty(
			"--docscribe-generate-background-color",
			colorToHex(
				DEFAULT_SETTINGS.appearance.DocscribeGenerateBackgroundColor
			)
		);
	}

	if (isValidHexColor(frontmatter.Docscribe_generate_font_color)) {
		settings.appearance.DocscribeGenerateFontColor =
			"#" + frontmatter.Docscribe_generate_font_color.substring(0, 6);

		root.style.setProperty(
			"--docscribe-generate-font-color",
			settings.appearance.DocscribeGenerateFontColor
		);
	} else {
		settings.appearance.DocscribeGenerateFontColor = colorToHex(
			DEFAULT_SETTINGS.appearance.DocscribeGenerateFontColor
		);

		frontmatter.Docscribe_generate_font_color =
			settings.appearance.DocscribeGenerateFontColor.replace(/^#/, "");

		root.style.setProperty(
			"--docscribe-generate-font-color",
			colorToHex(DEFAULT_SETTINGS.appearance.DocscribeGenerateFontColor)
		);
	}
}