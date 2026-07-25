/**
 * Wörterbücher der Oberfläche. Deutsch ist die Leitfassung: `Dict` leitet sich
 * daraus ab, sodass eine fehlende englische Übersetzung ein Typfehler ist.
 *
 * Werte mit Platzhaltern sind Funktionen, damit die Wortstellung je Sprache
 * frei bleibt.
 */
export const LOCALES = ["de", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  de: "Deutsch",
  en: "English",
};


/**
 * Setzt Platzhalter der Form {name} ein.
 *
 * Die Wörterbücher enthalten bewusst nur Zeichenketten: Funktionen lassen
 * sich nicht vom Server an Client-Komponenten übergeben.
 */
export function fill(
  template: string,
  vars: Record<string, string | number> = {},
): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in vars ? String(vars[key]) : whole,
  );
}

/** Wählt aus "Einzahl|Mehrzahl" die passende Form und füllt die Platzhalter. */
export function plural(
  template: string,
  n: number,
  vars: Record<string, string | number> = {},
): string {
  const [one, many = one] = template.split("|");
  return fill(n === 1 ? one : many, { n, ...vars });
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

const de = {
  app: {
    name: "Oylio Rental Dashboard",
    tagline: "Verwaltung von Mieteinkünften",
  },

  nav: {
    dashboard: "Dashboard",
    ta24: "TA24",
    users: "Benutzer",
    settings: "Einstellungen",
    signOut: "Abmelden",
    language: "Sprache",
  },

  roles: {
    admin: "Administrator",
    editor: "Bearbeiter",
    viewer: "Leser",
  },

  frequency: {
    monthly: "Monatlich",
    quarterly: "Quartalsweise",
    semiannual: "Halbjährlich",
    yearly: "Jährlich",
  },

  common: {
    save: "Speichern",
    cancel: "Abbrechen",
    delete: "Löschen",
    add: "Hinzufügen",
    edit: "Bearbeiten",
    back: "Zurück",
    amount: "Betrag",
    date: "Datum",
    note: "Notiz",
    reason: "Grund",
    source: "Quelle",
    none: "—",
    saving: "Wird gespeichert …",
    deleting: "Wird gelöscht …",
    irreversible:
      "Diese Aktion kann nicht rückgängig gemacht werden. Die Daten sind anschliessend endgültig verloren.",
    confirmType: "Tippe zur Bestätigung {word} ein:",
    deleteFinally: "Endgültig löschen",
  },

  login: {
    email: "E-Mail-Adresse",
    password: "Passwort",
    submit: "Anmelden",
    pending: "Wird angemeldet …",
    stayNote:
      "Du bleibst auf diesem Rechner dauerhaft angemeldet, bis du dich aktiv abmeldest.",
    missing: "Bitte E-Mail und Passwort eingeben.",
    wrong: "E-Mail-Adresse oder Passwort ist falsch.",
  },

  dashboard: {
    title: "Dashboard",
    newProperty: "Objekt anlegen",
    overview: "Objektübersicht",
    countProperties: "{n} Objekt|{n} Objekte",
    inLocations: " in {n} Standorten",
    hiddenCount: " · {n} ausgeblendet",
    dueSoFar: "Fällig bisher",
    received: "Erhalten",
    credits: "Gutschriften",
    balance: "Saldo",
    property: "Objekt",
    remaining: "Restlaufzeit",
    contractEnd: "Vertragsende",
    months: "{n} Mon.",
    total: "Gesamt",
    sumOf: "Summe {location}",
    plusHidden: "zzgl. {n} ausgeblendetes Objekt|zzgl. {n} ausgeblendete Objekte",
    allProperties: "Alle Objekte",
    addPayment: "+ Zahlung",
    archived: "Archiviert",
    expired: "Abgelaufen",
    missingRate: "Miete fehlt",
    creditSuffix: "+ {amount} Gutschrift",
    emptyTitle: "Noch keine Objekte angelegt",
    emptyNoActive: "Keine aktiven Objekte",
    emptyHint: "Lege dein erstes Objekt an.",
    emptyArchivedHint: "Alle Objekte sind archiviert oder ihre Verträge sind abgelaufen.",
    showArchive: "Archiv einblenden",
    hideArchive: "Archiv ausblenden",
    hiddenToggle: "{n} Objekt ausgeblendet — einblenden|{n} Objekte ausgeblendet — einblenden",
    noLocation: "Ohne Standort",
  },

  property: {
    backToDashboard: "← Zum Dashboard",
    noLocation: "Kein Standort",
    tenantPrefix: " · Mieter: {name}",
    recordPayment: "Zahlung erfassen",
    archive: "Archivieren",
    unarchive: "Aus Archiv holen",
    contractExpired: "Vertrag abgelaufen",
    missingRates: "Für manche Termine fehlt eine Miete",
    arrears: "Rückstand",
    settled: "Ausgeglichen bzw. im Voraus",

    tabs: {
      overview: "Übersicht",
      payments: "Zahlungen",
      credits: "Gutschriften",
      documents: "Dokumente",
      history: "Historie",
    },

    start: "Mietbeginn",
    end: "Vertragsende",
    remaining: "Restlaufzeit",
    remainingMonths: "{n} Monate",
    termTotal: "Laufzeit gesamt",
    termMonths: "{n} Monate",
    frequency: "Zahlungsrhythmus",
    volume: "Vertragsvolumen",
    notes: "Notizen",
    expired: "Abgelaufen",

    rentSteps: "Mietstaffel",
    rentStepsHint:
      "Zeiträume mit unterschiedlicher Miete. Der Betrag gilt je Zahlungszeitraum.",
    noRent: "Noch keine Miete hinterlegt — ohne Eintrag bleibt die Forderung bei 0 €.",
    validFrom: "Gültig ab",
    validTo: "Gültig bis",
    openEnd: "Leer lassen für offenes Ende.",
    open: "(offen)",
    fromTo: "ab {from} bis {to}",
    fromOpen: "ab {from} (offen)",
    addPeriod: "Zeitraum hinzufügen",

    paymentsTitle: "Zahlungseingänge",
    dueRates: "Fällige Raten",
    paymentDate: "Zahlungsdatum",
    due: "Fälligkeit",
    status: "Status",
    isDue: "Fällig",
    future: "Künftig",
    noRateSet: "keine Miete hinterlegt",
    allYears: "Alle",
    entries: "{n} Eintrag|{n} Einträge",
    receivedTotal: " insgesamt",
    receivedInYear: " im Jahr {year}",
    dueLabel: "Fällig",
    receivedLabel: "Erhalten",
    noPaymentsInPeriod: "Keine Zahlungen in diesem Zeitraum erfasst.",
    noDueInPeriod: "Für diesen Zeitraum sind keine Raten fällig.",
    pageOf: "Seite {page} von {total}",
    prev: "← Zurück",
    next: "Weiter →",
    withoutSource: "Ohne Angabe",
    unknownSource: "Unbekannt",

    creditsTitle: "Gutschriften",
    creditsHint:
      "Beträge, die dem Mieter angerechnet werden, z. B. selbst bezahlte Handwerker.",
    recordCredit: "Gutschrift erfassen",
    noCredits: "Keine Gutschriften erfasst.",

    documentsTitle: "Dokumente",
    documentsHint: "Mietverträge und andere Unterlagen zu diesem Objekt.",
    noDocuments: "Keine Dokumente hinterlegt.",
    chooseFile: "Datei auswählen",
    fileHint: "PDF oder Bild, maximal 20 MB.",
    upload: "Hochladen",

    historyTitle: "Vertragshistorie",
    historyHint: "Änderungen an Mietbeginn und Laufzeit.",
    historyStart: "Beginn {from} → ",
    historyTerm: "Laufzeit {from} → ",

    deleteTitle: "Objekt löschen",
    deleteHint:
      "Entfernt das Objekt samt Mietstaffel, Zahlungen und Gutschriften unwiderruflich. Zum reinen Ausblenden bitte archivieren.",
    deleteQuestion: "{name} löschen?",
    deleteDetail: "Das Objekt wird mit {payments} Zahlungen, {credits} Gutschriften, der kompletten Mietstaffel und allen Dokumenten entfernt.",
  },

  form: {
    masterData: "Stammdaten",
    newProperty: "Objekt anlegen",
    editSuffix: "{name} bearbeiten",
    masterHintNew: "Mietbeginn und Laufzeit bestimmen, wann welche Rate fällig wird.",
    masterHintEdit:
      "Änderungen an Mietbeginn oder Laufzeit werden in der Vertragshistorie festgehalten.",
    name: "Objektname",
    location: "Standort",
    locationHint: "Weitere Standorte legst du in den Einstellungen an.",
    noLocation: "Ohne Standort",
    tenant: "Mieter",
    frequency: "Zahlungsrhythmus",
    start: "Mietbeginn",
    startHint: "Bestimmt zugleich den Fälligkeitstag jeder Rate.",
    term: "Laufzeit in Monaten",
    initialRent: "Miete pro Zahlungszeitraum (€)",
    initialRentHint:
      "Optional. Weitere Zeiträume kannst du danach als Staffel ergänzen.",
    notes: "Notizen",
    ta24Label: "TA24",
    ta24Hint: " — relevant für die Steuererklärung in Malta",
    saveChanges: "Änderungen speichern",
    create: "Objekt anlegen",
    backToProperty: "← Zurück zum Objekt",
  },

  ta24: {
    title: "TA24-Auswertung",
    intro:
      "Grundlage sind die tatsächlich eingegangenen Zahlungen nach ihrem Zahlungsdatum, nicht die Fälligkeit. Eine Dezembermiete, die im Januar eingeht, zählt daher zum Januar-Jahr. Berücksichtigt sind alle Objekte mit TA24-Kennzeichen, auch archivierte. Gutschriften bleiben aussen vor, da ihnen kein Geldeingang gegenübersteht.",
    allYears: "Alle Jahre",
    allYearsHint: "Tatsächlich eingegangene Mieten auf Objekten mit TA24-Kennzeichen.",
    exportAll: "Alle Jahre als CSV",
    exportYear: "{year} als CSV",
    year: "Jahr",
    payments: "Zahlungen",
    received: "Erhalten",
    receivedIn: "Erhalten {year}",
    breakdown: "Aufschlüsselung {year}",
    total: "Gesamt",
    sumOf: "Summe {year}",
    property: "Objekt",
    location: "Standort",
    archived: "Archiviert",
    emptyTitle: "Keine Zahlungen auf TA24-Objekten",
    emptyHint:
      "Sobald für ein Objekt mit TA24-Kennzeichen Zahlungen erfasst sind, erscheinen sie hier.",
    countProperties: "{n} Objekt|{n} Objekte",
    countPayments: "{n} Zahlung|{n} Zahlungen",
  },

  users: {
    title: "Benutzer",
    intro:
      "Administratoren verwalten alles, Bearbeiter pflegen Objekte, Zahlungen und Stammdaten, Leser haben nur Einsicht.",
    accounts: "Konten",
    count: "{n} Benutzer",
    name: "Name",
    email: "E-Mail",
    role: "Rolle",
    resetPassword: "Passwort zurücksetzen",
    you: "Du",
    newPassword: "Neues Passwort",
    set: "Setzen",
    createTitle: "Benutzer anlegen",
    createHint:
      "Der Benutzer meldet sich mit dem Basispasswort an und kann es danach selbst ändern.",
    fullName: "Vollständiger Name",
    basePassword: "Basispasswort",
    minChars: "Mindestens 8 Zeichen.",
    create: "Benutzer anlegen",
    deleteTitle: "Benutzerkonto löschen?",
    deleteDetail: "{name} verliert den Zugang. Erfasste Zahlungen bleiben erhalten.",
  },

  settings: {
    title: "Einstellungen",
    account: "Mein Konto",
    name: "Name",
    email: "E-Mail",
    role: "Rolle",
    language: "Sprache",
    languageHint: "Gilt für dich auf allen Geräten.",
    changePassword: "Passwort ändern",
    changePasswordHint: "Gilt sofort für die nächste Anmeldung.",
    newPassword: "Neues Passwort",
    repeatPassword: "Neues Passwort wiederholen",
    minChars: "Mindestens 8 Zeichen.",
    submitPassword: "Passwort ändern",
    changingPassword: "Wird geändert …",

    locations: "Standorte",
    locationsHint:
      "Auswahlmöglichkeiten im Objektformular. Das Dashboard gruppiert danach.",
    newLocation: "Neuer Standort",
    locationPlaceholder: "z. B. Österreich",
    deleteLocation: "Standort löschen?",
    deleteLocationDetail:
      '„{name}" steht künftig nicht mehr zur Auswahl. Objekte mit diesem Standort behalten alle Daten und erscheinen dann unter „Ohne Standort".',

    sources: "Zahlungsquellen",
    sourcesHint: "Auswahlmöglichkeiten beim Erfassen eines Zahlungseingangs.",
    newSource: "Neue Zahlungsquelle",
    sourcePlaceholder: "z. B. Überweisung Malta",
    deleteSource: "Zahlungsquelle löschen?",
    deleteSourceDetail:
      '„{name}" steht künftig nicht mehr zur Auswahl. Bereits erfasste Zahlungen behalten ihren Betrag, verlieren aber die Quellenangabe.',
  },

  actions: {
    saved: "Änderungen gespeichert.",
    passwordChanged: "Passwort wurde geändert.",
    passwordMismatch: "Die beiden Passwörter stimmen nicht überein.",
    passwordTooShort: "Das Passwort muss mindestens 8 Zeichen lang sein.",
    noPermission: "Keine Berechtigung.",
    nothingSaved:
      "Es wurde nichts gespeichert — das Objekt existiert nicht mehr oder die Seite ist veraltet. Bitte die Seite neu laden.",
    needName: "Bitte einen Objektnamen angeben.",
    needStart: "Bitte den Mietbeginn angeben.",
    needTerm: "Die Laufzeit muss eine ganze Zahl von mindestens 1 Monat sein.",
    badFrequency: "Ungültiger Zahlungsrhythmus.",
    needAmount: "Bitte einen gültigen Betrag angeben.",
    needRent: "Bitte einen gültigen Mietbetrag angeben.",
    needDate: "Bitte das Datum angeben.",
    needPaymentDate: "Bitte das Zahlungsdatum angeben.",
    needStartDate: "Bitte ein Startdatum angeben.",
    endBeforeStart: "Das Enddatum liegt vor dem Startdatum.",
    periodAdded: "Mietzeitraum hinzugefügt.",
    paymentAdded: "Zahlung erfasst.",
    creditAdded: "Gutschrift erfasst.",
    needFile: "Bitte eine Datei auswählen.",
    fileTooBig: "Die Datei ist grösser als 20 MB.",
    uploaded: "Dokument hochgeladen.",
    needLabel: "Bitte eine Bezeichnung angeben.",
    sourceExists: "Diese Zahlungsquelle existiert bereits.",
    locationExists: "Diesen Standort gibt es bereits.",
    added: '„{name}" wurde hinzugefügt.',
    needNameEmail: "Bitte Name und E-Mail-Adresse angeben.",
    basePasswordTooShort: "Das Basispasswort muss mindestens 8 Zeichen lang sein.",
    badRole: "Ungültige Rolle.",
    emailExists: "Für diese E-Mail-Adresse besteht bereits ein Konto.",
    userCreated: "{name} wurde angelegt.",
    passwordReset: "Passwort wurde neu gesetzt.",
  },

  documents: {
    deleteTitle: "Dokument löschen?",
    deleteDetail: '„{name}" wird aus dem Speicher entfernt.',
  },
};

export type Dict = typeof de;

const en: Dict = {
  app: {
    name: "Oylio Rental Dashboard",
    tagline: "Rental income management",
  },

  nav: {
    dashboard: "Dashboard",
    ta24: "TA24",
    users: "Users",
    settings: "Settings",
    signOut: "Sign out",
    language: "Language",
  },

  roles: {
    admin: "Administrator",
    editor: "Editor",
    viewer: "Viewer",
  },

  frequency: {
    monthly: "Monthly",
    quarterly: "Quarterly",
    semiannual: "Semi-annually",
    yearly: "Annually",
  },

  common: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    add: "Add",
    edit: "Edit",
    back: "Back",
    amount: "Amount",
    date: "Date",
    note: "Note",
    reason: "Reason",
    source: "Source",
    none: "—",
    saving: "Saving …",
    deleting: "Deleting …",
    irreversible:
      "This cannot be undone. The data will be permanently lost.",
    confirmType: "Type {word} to confirm:",
    deleteFinally: "Delete permanently",
  },

  login: {
    email: "Email address",
    password: "Password",
    submit: "Sign in",
    pending: "Signing in …",
    stayNote: "You stay signed in on this computer until you sign out.",
    missing: "Please enter email and password.",
    wrong: "Email address or password is incorrect.",
  },

  dashboard: {
    title: "Dashboard",
    newProperty: "Add property",
    overview: "Properties",
    countProperties: "{n} property|{n} properties",
    inLocations: " across {n} locations",
    hiddenCount: " · {n} hidden",
    dueSoFar: "Due to date",
    received: "Received",
    credits: "Credits",
    balance: "Balance",
    property: "Property",
    remaining: "Remaining",
    contractEnd: "Contract ends",
    months: "{n} mo.",
    total: "Total",
    sumOf: "Subtotal {location}",
    plusHidden: "plus {n} hidden property|plus {n} hidden properties",
    allProperties: "All properties",
    addPayment: "+ Payment",
    archived: "Archived",
    expired: "Expired",
    missingRate: "No rent set",
    creditSuffix: "+ {amount} credit",
    emptyTitle: "No properties yet",
    emptyNoActive: "No active properties",
    emptyHint: "Add your first property.",
    emptyArchivedHint: "All properties are archived or their contracts have ended.",
    showArchive: "Show archive",
    hideArchive: "Hide archive",
    hiddenToggle: "{n} property hidden — show|{n} properties hidden — show",
    noLocation: "No location",
  },

  property: {
    backToDashboard: "← Back to dashboard",
    noLocation: "No location",
    tenantPrefix: " · Tenant: {name}",
    recordPayment: "Record payment",
    archive: "Archive",
    unarchive: "Restore from archive",
    contractExpired: "Contract ended",
    missingRates: "Some due dates have no rent set",
    arrears: "In arrears",
    settled: "Settled or paid ahead",

    tabs: {
      overview: "Overview",
      payments: "Payments",
      credits: "Credits",
      documents: "Documents",
      history: "History",
    },

    start: "Start of tenancy",
    end: "Contract ends",
    remaining: "Remaining",
    remainingMonths: "{n} months",
    termTotal: "Total term",
    termMonths: "{n} months",
    frequency: "Payment frequency",
    volume: "Contract value",
    notes: "Notes",
    expired: "Ended",

    rentSteps: "Rent schedule",
    rentStepsHint:
      "Periods with differing rent. The amount applies per payment period.",
    noRent: "No rent set yet — without an entry the amount due stays at €0.",
    validFrom: "Valid from",
    validTo: "Valid until",
    openEnd: "Leave empty for an open end.",
    open: "(open)",
    fromTo: "from {from} to {to}",
    fromOpen: "from {from} (open)",
    addPeriod: "Add period",

    paymentsTitle: "Payments received",
    dueRates: "Scheduled instalments",
    paymentDate: "Payment date",
    due: "Due date",
    status: "Status",
    isDue: "Due",
    future: "Upcoming",
    noRateSet: "no rent set",
    allYears: "All",
    entries: "{n} entry|{n} entries",
    receivedTotal: " in total",
    receivedInYear: " in {year}",
    dueLabel: "Due",
    receivedLabel: "Received",
    noPaymentsInPeriod: "No payments recorded for this period.",
    noDueInPeriod: "No instalments fall due in this period.",
    pageOf: "Page {page} of {total}",
    prev: "← Previous",
    next: "Next →",
    withoutSource: "Not specified",
    unknownSource: "Unknown",

    creditsTitle: "Credits",
    creditsHint:
      "Amounts credited to the tenant, e.g. repairs they paid for themselves.",
    recordCredit: "Record credit",
    noCredits: "No credits recorded.",

    documentsTitle: "Documents",
    documentsHint: "Lease agreements and other paperwork for this property.",
    noDocuments: "No documents stored.",
    chooseFile: "Choose file",
    fileHint: "PDF or image, up to 20 MB.",
    upload: "Upload",

    historyTitle: "Contract history",
    historyHint: "Changes to start date and term.",
    historyStart: "Start {from} → ",
    historyTerm: "Term {from} → ",

    deleteTitle: "Delete property",
    deleteHint:
      "Permanently removes the property together with its rent schedule, payments and credits. To merely hide it, archive it instead.",
    deleteQuestion: "Delete {name}?",
    deleteDetail: "The property will be removed along with {payments} payments, {credits} credits, the entire rent schedule and all documents.",
  },

  form: {
    masterData: "Details",
    newProperty: "Add property",
    editSuffix: "Edit {name}",
    masterHintNew:
      "Start date and term determine when each instalment falls due.",
    masterHintEdit:
      "Changes to the start date or term are recorded in the contract history.",
    name: "Property name",
    location: "Location",
    locationHint: "Add further locations under Settings.",
    noLocation: "No location",
    tenant: "Tenant",
    frequency: "Payment frequency",
    start: "Start of tenancy",
    startHint: "Also determines the day of the month each instalment is due.",
    term: "Term in months",
    initialRent: "Rent per payment period (€)",
    initialRentHint: "Optional. You can add further periods afterwards.",
    notes: "Notes",
    ta24Label: "TA24",
    ta24Hint: " — relevant for the Malta tax return",
    saveChanges: "Save changes",
    create: "Add property",
    backToProperty: "← Back to property",
  },

  ta24: {
    title: "TA24 report",
    intro:
      "Based on payments actually received, by their payment date rather than their due date. A December rent arriving in January therefore counts towards January's year. All properties flagged TA24 are included, archived ones too. Credits are excluded, as no money changed hands.",
    allYears: "All years",
    allYearsHint: "Rent actually received on properties flagged TA24.",
    exportAll: "All years as CSV",
    exportYear: "{year} as CSV",
    year: "Year",
    payments: "Payments",
    received: "Received",
    receivedIn: "Received {year}",
    breakdown: "Breakdown {year}",
    total: "Total",
    sumOf: "Total {year}",
    property: "Property",
    location: "Location",
    archived: "Archived",
    emptyTitle: "No payments on TA24 properties",
    emptyHint:
      "Once payments are recorded for a property flagged TA24, they appear here.",
    countProperties: "{n} property|{n} properties",
    countPayments: "{n} payment|{n} payments",
  },

  users: {
    title: "Users",
    intro:
      "Administrators manage everything, editors maintain properties, payments and reference data, viewers have read-only access.",
    accounts: "Accounts",
    count: "{n} users",
    name: "Name",
    email: "Email",
    role: "Role",
    resetPassword: "Reset password",
    you: "You",
    newPassword: "New password",
    set: "Set",
    createTitle: "Add user",
    createHint:
      "The user signs in with the initial password and can change it afterwards.",
    fullName: "Full name",
    basePassword: "Initial password",
    minChars: "At least 8 characters.",
    create: "Add user",
    deleteTitle: "Delete user account?",
    deleteDetail: "{name} will lose access. Recorded payments are kept.",
  },

  settings: {
    title: "Settings",
    account: "My account",
    name: "Name",
    email: "Email",
    role: "Role",
    language: "Language",
    languageHint: "Applies to you on every device.",
    changePassword: "Change password",
    changePasswordHint: "Takes effect at your next sign-in.",
    newPassword: "New password",
    repeatPassword: "Repeat new password",
    minChars: "At least 8 characters.",
    submitPassword: "Change password",
    changingPassword: "Changing …",

    locations: "Locations",
    locationsHint:
      "Choices in the property form. The dashboard groups by these.",
    newLocation: "New location",
    locationPlaceholder: "e.g. Austria",
    deleteLocation: "Delete location?",
    deleteLocationDetail:
      "“{name}” will no longer be offered. Properties with this location keep all their data and appear under “No location”.",

    sources: "Payment sources",
    sourcesHint: "Choices when recording an incoming payment.",
    newSource: "New payment source",
    sourcePlaceholder: "e.g. Bank transfer Malta",
    deleteSource: "Delete payment source?",
    deleteSourceDetail:
      "“{name}” will no longer be offered. Payments already recorded keep their amount but lose the source.",
  },

  actions: {
    saved: "Changes saved.",
    passwordChanged: "Password changed.",
    passwordMismatch: "The two passwords do not match.",
    passwordTooShort: "The password must be at least 8 characters long.",
    noPermission: "Not permitted.",
    nothingSaved:
      "Nothing was saved — the property no longer exists or this page is out of date. Please reload.",
    needName: "Please enter a property name.",
    needStart: "Please enter the start of the tenancy.",
    needTerm: "The term must be a whole number of at least 1 month.",
    badFrequency: "Invalid payment frequency.",
    needAmount: "Please enter a valid amount.",
    needRent: "Please enter a valid rent amount.",
    needDate: "Please enter the date.",
    needPaymentDate: "Please enter the payment date.",
    needStartDate: "Please enter a start date.",
    endBeforeStart: "The end date is before the start date.",
    periodAdded: "Rent period added.",
    paymentAdded: "Payment recorded.",
    creditAdded: "Credit recorded.",
    needFile: "Please choose a file.",
    fileTooBig: "The file is larger than 20 MB.",
    uploaded: "Document uploaded.",
    needLabel: "Please enter a name.",
    sourceExists: "This payment source already exists.",
    locationExists: "This location already exists.",
    added: "“{name}” was added.",
    needNameEmail: "Please enter name and email address.",
    basePasswordTooShort:
      "The initial password must be at least 8 characters long.",
    badRole: "Invalid role.",
    emailExists: "An account already exists for this email address.",
    userCreated: "{name} was created.",
    passwordReset: "Password has been reset.",
  },

  documents: {
    deleteTitle: "Delete document?",
    deleteDetail: "“{name}” will be removed from storage.",
  },
};

export const dictionaries: Record<Locale, Dict> = { de, en };
