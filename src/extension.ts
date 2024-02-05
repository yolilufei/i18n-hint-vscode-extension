// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import path from 'path';
import fs from 'fs';
import * as vscode from 'vscode';
// import a from 'te.'
const packName = 'locales';
let langPackDir = '';
const FIX_EXT = '.json';
let hightContent: vscode.DocumentHighlight[] = [];
const getLangPackDir = (filePath: string) => {
	const upperDir = path.dirname(filePath);
	const matchedPackName = fs.readdirSync(upperDir).filter(f => f === packName);
	if (matchedPackName.length) {
		langPackDir = `${upperDir}/${packName}`;
	} else {
		getLangPackDir(upperDir);
	}
}

const getMatchedLabel = (content: Record<string, any>, key: string) => {
	const keys = key.split('.');
	const label = keys.reduce((p, n) => p[n], content);
	return label;
}

const prevHoverContent: Record<string, vscode.Hover> = {}

const hoverProvider: vscode.HoverProvider = {
	provideHover(document, position, token) {
		
		const word = document.getText(document.getWordRangeAtPosition(position));
		const line = document.lineAt(position);
		if (!vscode.workspace.workspaceFolders) return;
		const matchedFolder = vscode.workspace.workspaceFolders?.filter(folder => document.uri.path.startsWith(folder.uri.path));
		const folderRootPath = matchedFolder[0].uri.path;
		getLangPackDir(document.uri.path);
		const langFileList = fs.readdirSync(langPackDir);
		const langMapping: Record<string, any> = {};
		if (langFileList.filter(l => path.extname(l) === FIX_EXT).length !== langFileList.length) return;
		if (line.range.isSingleLine) {
			const matches = line.text.match(new RegExp(`lang\\('([\\w\\.]*${word}[\\w\\.]*)'\\)`));
			if (matches) {
				const langKeys = matches[1];
				if (prevHoverContent[langKeys]) {
					return prevHoverContent[langKeys];
				}
				const rangeStart = line.text.indexOf(langKeys);
				const rangeEnd = rangeStart + langKeys.length;
				langFileList.forEach((l: string) => {
					const c = fs.readFileSync(`${langPackDir}/${l}`, 'utf-8').toString();
					const matchedLabel = getMatchedLabel(JSON.parse(c), langKeys);
					langMapping[l.split('.')[0]] = matchedLabel;
				});
				const contents = Object.keys(langMapping).map(m => ( `[dest](${langPackDir}/${m}${FIX_EXT}) | ${m}: ${langMapping[m]}`));
				// const additional = new vscode.MarkdownString('<button>定位到文件</button>', true);
				// additional.supportHtml = true;
				// @ts-ignore
				// contents.push(additional);
				const range = new vscode.Range(new vscode.Position(line.lineNumber, rangeStart), new vscode.Position(line.lineNumber, rangeEnd));
				prevHoverContent[langKeys] = {contents, range};
				return {
					contents,
					range
				};
			}
		}
		return null;
	},
}

const languageActive = ['typescriptreact', 'typescript', 'javascript', 'javascriptreact']

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const provider = vscode.languages.registerHoverProvider(languageActive, hoverProvider);
	context.subscriptions.push(provider);
}

// This method is called when your extension is deactivated
export function deactivate() {}
