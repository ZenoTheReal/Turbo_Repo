import crypto from 'node:crypto';

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  tag: string;
}

export class CryptoUtil {
  private static deriveKey(secret: string): Buffer {
    return crypto.scryptSync(secret, 'omnistore-stripe-salt-v1', 32);
  }

  /**
   * Encrypts a string using AES-256-GCM authenticated encryption.
   */
  static encrypt(plainText: string, secretKey: string): EncryptedPayload {
    const key = this.deriveKey(secretKey);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let ciphertext = cipher.update(plainText, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    const tag = cipher.getAuthTag().toString('hex');

    return {
      ciphertext,
      iv: iv.toString('hex'),
      tag,
    };
  }

  /**
   * Decrypts an AES-256-GCM ciphertext using the provided IV and Auth Tag.
   */
  static decrypt(payload: EncryptedPayload, secretKey: string): string {
    const key = this.deriveKey(secretKey);
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(payload.iv, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(payload.tag, 'hex'));

    let decrypted = decipher.update(payload.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
