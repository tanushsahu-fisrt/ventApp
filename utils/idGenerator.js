import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';

class IdGenerator {
  static generateUUID() {
    try {
      return uuidv4();
    } catch (error) {
      console.error('Error generating UUID:', error);
      return this.generateFallbackId();
    }
  }

  static generateSessionId() {
    try {
      const bytes = crypto.getRandomValues(new Uint8Array(8));
      const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
      return `session_${hex}`;
    } catch (error) {
      console.error('Error generating session ID:', error);
      return this.generateFallbackId('session');
    }
  }

  static generateChannelName() {
    try {
      const bytes = crypto.getRandomValues(new Uint8Array(6));
      const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
      const timestamp = Date.now().toString(36);
      return `ventbox_${timestamp}_${hex}`;
    } catch (error) {
      console.error('Error generating channel name:', error);
      return this.generateFallbackId('ventbox');
    }
  }

  static generateUserId() {
    try {
      const bytes = crypto.getRandomValues(new Uint8Array(12));
      const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
      return `user_${hex}`;
    } catch (error) {
      console.error('Error generating user ID:', error);
      return this.generateFallbackId('user');
    }
  }

  static generateToken(length = 32) {
    try {
      const bytes = crypto.getRandomValues(new Uint8Array(length));
      return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('Error generating token:', error);
      return this.generateFallbackId('token');
    }
  }

  static generateFallbackId(prefix = 'id') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}_${timestamp}_${random}`;
  }

  static generateShortId(length = 8) {
    try {
      const bytes = crypto.getRandomValues(new Uint8Array(Math.ceil(length / 2)));
      return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .substring(0, length)
        .toUpperCase();
    } catch (error) {
      console.error('Error generating short ID:', error);
      return Math.random().toString(36).substr(2, length).toUpperCase();
    }
  }

  static isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  static generateHash(input) {
    try {
      return CryptoJS.SHA256(input).toString(CryptoJS.enc.Hex);
    } catch (error) {
      console.error('Error generating hash:', error);
      return null;
    }
  }
}

export default IdGenerator;
