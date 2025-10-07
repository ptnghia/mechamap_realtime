const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

/**
 * Translation Service
 * Handles text and HTML translation using MyMemory API (Free)
 */
class TranslationService {
  constructor() {
    // MyMemory API base URL
    this.apiBaseUrl = 'https://api.mymemory.translated.net/get';

    // Supported language codes (MyMemory format)
    this.supportedLanguages = new Set([
      'auto', 'af', 'sq', 'ar', 'hy', 'az', 'eu', 'be', 'bn', 'bs', 'bg', 'ca',
      'zh-cn', 'zh-tw', 'hr', 'cs', 'da', 'nl', 'en', 'et', 'tl', 'fi', 'fr',
      'gl', 'ka', 'de', 'el', 'gu', 'ht', 'he', 'hi', 'hu', 'is', 'id', 'ga',
      'it', 'ja', 'kn', 'kk', 'ko', 'ky', 'la', 'lv', 'lt', 'mk', 'ms', 'ml',
      'mt', 'mn', 'my', 'ne', 'no', 'fa', 'pl', 'pt', 'ro', 'ru', 'sr', 'si',
      'sk', 'sl', 'es', 'sw', 'sv', 'ta', 'te', 'th', 'tr', 'uk', 'ur', 'uz',
      'vi', 'cy', 'yi'
    ]);

    // HTML tags that should not be translated
    this.skipTags = new Set(['script', 'style', 'code', 'pre', 'noscript']);

    // HTML attributes that might contain translatable text
    this.translatableAttributes = new Set(['title', 'alt', 'placeholder']);

    // Request timeout
    this.timeout = 10000;
  }

  /**
   * Validate language code
   * @param {string} langCode - Language code to validate
   * @returns {boolean} - True if valid
   */
  validateLanguageCode(langCode) {
    if (!langCode || typeof langCode !== 'string') {
      return false;
    }
    return this.supportedLanguages.has(langCode.toLowerCase());
  }

  /**
   * Make API request to MyMemory
   * @param {string} text - Text to translate
   * @param {string} langpair - Language pair (e.g., 'en|vi')
   * @returns {Promise<Object>} - API response
   */
  async makeApiRequest(text, langpair) {
    try {
      const response = await axios.get(this.apiBaseUrl, {
        params: {
          q: text,
          langpair: langpair
        },
        timeout: this.timeout,
        headers: {
          'User-Agent': 'MechaMap-Realtime-Server/1.0'
        }
      });

      if (response.data && response.data.responseStatus === 200) {
        return response.data;
      } else {
        throw new Error(`API Error: ${response.data?.responseDetails || 'Unknown error'}`);
      }
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Translation request timeout');
      }
      throw new Error(`Translation API error: ${error.message}`);
    }
  }

  /**
   * Detect language of text using simple heuristics
   * @param {string} text - Text to detect language
   * @returns {Promise<string>} - Detected language code
   */
  async detectLanguage(text) {
    try {
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        throw new Error('Text is required for language detection');
      }

      // Use heuristic detection (MyMemory doesn't provide direct language detection)
      const detectedLang = this.detectLanguageHeuristic(text);

      return detectedLang;
    } catch (error) {
      logger.error('Language detection failed:', error);
      throw new Error(`Language detection failed: ${error.message}`);
    }
  }

  /**
   * Simple language detection heuristic
   * @param {string} text - Text to analyze
   * @returns {string} - Detected language code
   */
  detectLanguageHeuristic(text) {
    const lowerText = text.toLowerCase();

    // Vietnamese patterns
    if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/.test(text)) {
      return 'vi';
    }

    // Chinese patterns
    if (/[\u4e00-\u9fff]/.test(text)) {
      return 'zh-cn';
    }

    // Japanese patterns
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) {
      return 'ja';
    }

    // Korean patterns
    if (/[\uac00-\ud7af]/.test(text)) {
      return 'ko';
    }

    // Arabic patterns
    if (/[\u0600-\u06ff]/.test(text)) {
      return 'ar';
    }

    // Russian patterns
    if (/[а-яё]/i.test(text)) {
      return 'ru';
    }

    // French patterns (more specific)
    if (/\b(bonjour|comment|allez|vous|merci|oui|non|avec|pour|dans|sur|être|avoir)\b/i.test(lowerText) ||
        /[àâäéèêëïîôöùûüÿç]/i.test(text)) {
      return 'fr';
    }

    // German patterns
    if (/\b(der|die|das|und|ist|in|zu|den|von|mit|auf|für)\b/i.test(lowerText)) {
      return 'de';
    }

    // Spanish patterns
    if (/\b(el|la|los|las|un|una|y|es|en|de|a|por|con|para)\b/i.test(lowerText)) {
      return 'es';
    }

    // Default to English
    return 'en';
  }

  /**
   * Translate plain text
   * @param {string} text - Text to translate
   * @param {string} sourceLanguage - Source language code
   * @param {string} targetLanguage - Target language code
   * @returns {Promise<Object>} - Translation result
   */
  async translateText(text, sourceLanguage, targetLanguage) {
    try {
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        throw new Error('Text is required for translation');
      }

      if (!this.validateLanguageCode(targetLanguage)) {
        throw new Error(`Invalid target language code: ${targetLanguage}`);
      }

      if (sourceLanguage !== 'auto' && !this.validateLanguageCode(sourceLanguage)) {
        throw new Error(`Invalid source language code: ${sourceLanguage}`);
      }

      // Handle auto-detection
      let actualSourceLang = sourceLanguage;
      if (sourceLanguage === 'auto') {
        actualSourceLang = this.detectLanguageHeuristic(text);
      }

      // Create language pair for MyMemory API
      const langpair = `${actualSourceLang}|${targetLanguage}`;

      // Make API request
      const result = await this.makeApiRequest(text, langpair);

      return {
        originalText: text,
        translatedText: result.responseData.translatedText,
        sourceLanguage: actualSourceLang,
        targetLanguage: targetLanguage,
        detectedLanguage: actualSourceLang,
        confidence: result.responseData.match || 0
      };
    } catch (error) {
      logger.error('Text translation failed:', error);
      throw new Error(`Translation failed: ${error.message}`);
    }
  }

  /**
   * Extract text content from HTML element
   * @param {Object} element - Cheerio element
   * @returns {Array} - Array of text nodes with their positions
   */
  extractTextNodes(element) {
    const textNodes = [];
    
    element.contents().each((index, node) => {
      if (node.type === 'text') {
        const text = node.data.trim();
        if (text.length > 0) {
          textNodes.push({
            index,
            text,
            node
          });
        }
      } else if (node.type === 'tag' && !this.skipTags.has(node.name)) {
        // Recursively extract from child elements
        const childNodes = this.extractTextNodes(cheerio(node));
        textNodes.push(...childNodes);
      }
    });

    return textNodes;
  }

  /**
   * Translate HTML content
   * @param {string} html - HTML content to translate
   * @param {string} sourceLanguage - Source language code
   * @param {string} targetLanguage - Target language code
   * @returns {Promise<Object>} - Translation result
   */
  async translateHTML(html, sourceLanguage, targetLanguage) {
    try {
      if (!html || typeof html !== 'string' || html.trim().length === 0) {
        throw new Error('HTML content is required for translation');
      }

      if (!this.validateLanguageCode(targetLanguage)) {
        throw new Error(`Invalid target language code: ${targetLanguage}`);
      }

      if (sourceLanguage !== 'auto' && !this.validateLanguageCode(sourceLanguage)) {
        throw new Error(`Invalid source language code: ${sourceLanguage}`);
      }

      // Parse HTML
      const $ = cheerio.load(html, { 
        decodeEntities: false,
        xmlMode: false 
      });

      // Extract all text content
      const textContents = [];
      
      $('*').each((index, element) => {
        const $element = $(element);
        
        // Skip certain tags
        if (this.skipTags.has(element.name)) {
          return;
        }

        // Extract direct text content (not from children)
        $element.contents().filter(function() {
          return this.type === 'text';
        }).each((textIndex, textNode) => {
          const text = $(textNode).text().trim();
          if (text.length > 0) {
            textContents.push({
              element: $element,
              textNode: $(textNode),
              originalText: text,
              elementIndex: index,
              textIndex: textIndex
            });
          }
        });

        // Extract translatable attributes
        this.translatableAttributes.forEach(attr => {
          const attrValue = $element.attr(attr);
          if (attrValue && attrValue.trim().length > 0) {
            textContents.push({
              element: $element,
              attribute: attr,
              originalText: attrValue.trim(),
              elementIndex: index,
              isAttribute: true
            });
          }
        });
      });

      if (textContents.length === 0) {
        return {
          originalText: html,
          translatedText: html,
          sourceLanguage: sourceLanguage,
          targetLanguage: targetLanguage,
          detectedLanguage: sourceLanguage === 'auto' ? 'unknown' : sourceLanguage
        };
      }

      // Combine all text for translation to maintain context
      const combinedText = textContents.map(item => item.originalText).join('\n');
      
      // Translate combined text
      const translationResult = await this.translateText(combinedText, sourceLanguage, targetLanguage);
      
      // Split translated text back
      const translatedTexts = translationResult.translatedText.split('\n');

      // Apply translations back to HTML
      textContents.forEach((item, index) => {
        if (index < translatedTexts.length) {
          const translatedText = translatedTexts[index];
          
          if (item.isAttribute) {
            // Update attribute
            item.element.attr(item.attribute, translatedText);
          } else {
            // Update text node
            item.textNode.replaceWith(translatedText);
          }
        }
      });

      return {
        originalText: html,
        translatedText: $.html(),
        sourceLanguage: translationResult.sourceLanguage,
        targetLanguage: targetLanguage,
        detectedLanguage: translationResult.detectedLanguage
      };

    } catch (error) {
      logger.error('HTML translation failed:', error);
      throw new Error(`HTML translation failed: ${error.message}`);
    }
  }

  /**
   * Main translation method
   * @param {string} content - Content to translate
   * @param {string} sourceLanguage - Source language code
   * @param {string} targetLanguage - Target language code
   * @param {string} contentType - Content type ('text' or 'html')
   * @returns {Promise<Object>} - Translation result
   */
  async translate(content, sourceLanguage, targetLanguage, contentType = 'text') {
    try {
      if (contentType === 'html') {
        return await this.translateHTML(content, sourceLanguage, targetLanguage);
      } else {
        return await this.translateText(content, sourceLanguage, targetLanguage);
      }
    } catch (error) {
      logger.error('Translation service error:', error);
      throw error;
    }
  }
}

module.exports = new TranslationService();
