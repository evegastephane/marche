export interface OutgoingEmail {
  to: string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** Évite un double envoi si le job est rejoué (Resend l'honore). */
  idempotencyKey?: string;
}

/** Canal e-mail (pattern Bridge : le type de notification varie indépendamment du canal). */
export abstract class EmailSender {
  abstract send(email: OutgoingEmail): Promise<void>;
}
