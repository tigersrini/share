/**
 * Reference catalog of common motorcycle/scooter OEMs and models seen in
 * Indian garages. Used as a fallback/seed for the make+model pickers —
 * actual usage frequency from this garage's own Vehicle records always
 * takes priority over this static ordering (see /api/vehicle-catalog).
 */
export const REFERENCE_CATALOG: Record<string, string[]> = {
  "Hero MotoCorp": ["Splendor Plus", "HF Deluxe", "Passion Pro", "Glamour", "Xtreme 160R", "Xpulse 200", "Maestro Edge", "Pleasure Plus", "Destini 125"],
  Honda: ["Activa 6G", "Activa 125", "Shine", "SP 125", "Unicorn", "Hornet 2.0", "Dio", "CB350", "Livo"],
  Bajaj: ["Pulsar 150", "Pulsar NS200", "Pulsar 220F", "Platina", "CT 100", "Avenger 220", "Dominar 400", "Chetak"],
  TVS: ["Jupiter", "Apache RTR 160", "Apache RTR 200 4V", "Ntorq 125", "Raider 125", "Sport", "XL100", "Star City Plus"],
  "Royal Enfield": ["Classic 350", "Bullet 350", "Hunter 350", "Meteor 350", "Himalayan", "Continental GT 650"],
  Yamaha: ["FZ-S", "FZ25", "R15 V4", "MT-15", "Ray ZR", "Fascino 125", "Aerox 155"],
  Suzuki: ["Access 125", "Gixxer", "Gixxer SF", "Burgman Street", "Avenis"],
  KTM: ["Duke 200", "Duke 250", "Duke 390", "RC 200", "RC 390"],
  "Jawa/Yezdi": ["Jawa 42", "Jawa Perak", "Yezdi Roadster", "Yezdi Adventure"],
  Piaggio: ["Vespa VXL", "Vespa SXL", "Aprilia SR160"],
};

export interface CatalogResponse {
  makes: string[];
  modelsByMake: Record<string, string[]>;
}
