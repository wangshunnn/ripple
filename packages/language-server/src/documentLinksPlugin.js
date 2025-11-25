/** @import { LanguageServicePlugin } from '@volar/language-server' */
/** @import { RippleVirtualCode } from '@ripple-ts/typescript-plugin/src/language.js') */

const { URI } = require('vscode-uri');

const DEBUG = process.env.RIPPLE_DEBUG === 'true';

/**
 * @param {...unknown} args
 */
function log(...args) {
	if (DEBUG) {
		console.log('[Ripple Document Links]', ...args);
	}
}

/**
 * @returns {LanguageServicePlugin}
 */
function createDocumentLinksPlugin() {
	return {
		name: 'ripple-document-links',
		capabilities: {
			documentLinkProvider: {},
		},
		create(context) {
			return {
				async provideDocumentLinks(document) {
					const uri = URI.parse(document.uri);
					const decoded = context.decodeEmbeddedDocumentUri(uri);
					if (!decoded) {
						return;
					}
					const [sourceUri, virtualCodeId] = decoded;
					if (virtualCodeId !== 'root') {
						return;
					}
					const sourceScript = context.language.scripts.get(sourceUri);
					const virtualCode = /** @type {RippleVirtualCode } */ (
						sourceScript?.generated?.embeddedCodes.get(virtualCodeId)
					);

					const documentLink = [];

					// Add document link for style class
					const scopedClasses = virtualCode.scopedClasses ?? [];
					for (const { className, offset } of scopedClasses) {
						const styleDocumentUri = context.encodeEmbeddedDocumentUri(sourceUri, 'style_' + 0);
						const styleVirtualCode = virtualCode.embeddedCodes?.find(
							({ id }) => id === 'style_' + 0,
						);
						if (!styleVirtualCode) {
							continue;
						}
						const styleDocument = context.documents.get(
							styleDocumentUri,
							styleVirtualCode.languageId,
							styleVirtualCode.snapshot,
						);
						const start = styleDocument.positionAt(1);
						const end = styleDocument.positionAt(1 + className.length + 1);

						log('Add documentLink for class:', className, 'offset:', offset);

						documentLink.push({
							range: {
								start: document.positionAt(offset),
								end: document.positionAt(offset + className.length),
							},
							target:
								context.encodeEmbeddedDocumentUri(sourceUri, 'style_' + 0) +
								`#L${start.line + 1},${start.character + 1}-L${end.line + 1},${end.character + 1}`,
						});
					}

					log('Add documentLink for class-jump-to-style:', documentLink[0].range.start);

					return documentLink;
				},
			};
		},
	};
}

module.exports = {
	createDocumentLinksPlugin,
};
