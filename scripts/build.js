#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

const ROOT = path.join(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');

// Ensure output directories exist
fs.mkdirSync(path.join(DOCS, 'data'), { recursive: true });
fs.mkdirSync(path.join(DOCS, 'assets'), { recursive: true });

// ---------------------------------------------------------------------------
// XML parser configuration
// ---------------------------------------------------------------------------
// Native-language fallback for mods that have no English localization.
// Key: nativeLang value used in mod config → file prefix used in locale filenames.
const NATIVE_LANG_PREFIXES = { 'zh-cn': 'ZhHans', 'zh-tw': 'ZhTw' };

const ALWAYS_ARRAY = new Set([
  'GameDBMedicalCondition', 'GameDBSymptom', 'GameDBExamination',
  'GameDBTreatment', 'GameDBDiagnosisOccurrence', 'GameDBLocalizedString',
  'GameDBSymptomRules', 'ExaminationRef', 'TreatmentRef', 'Tag',
  'SkillRef', 'Complication', 'GameDBAsset',
]);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (tagName) => ALWAYS_ARRAY.has(tagName),
  trimValues: true,
});

function parseXml(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`  [SKIP] Not found: ${filePath}`);
    return null;
  }
  const xml = fs.readFileSync(filePath, 'utf8');
  return parser.parse(xml);
}

function p(filePath) {
  return path.join(ROOT, filePath.replace(/\//g, path.sep));
}

// Recursively collect all .xml files under a directory (sorted).
function scanXmlRecursive(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) results.push(...scanXmlRecursive(full));
    else if (entry.endsWith('.xml')) results.push(full);
  }
  return results;
}

// ---------------------------------------------------------------------------
// Mod configurations — one entry per modded department pack
// ---------------------------------------------------------------------------
const MODS = [
  {
    id:      'mod_oncology',
    name:    'Oncology Department',
    author:  'Sleepy068',
    steamUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=1938136264',
    folder: 'Game Data/ModdedDepartments/Department of Oncology',
    departments: [
      { id: 'DPT_ONCOLOGY', abbreviation: 'ONC', order: 100, colorKey: 'oncology' },
    ],
    occurrenceFile:   'Database/ModDepartment/ModDiagnosisOccurrences.xml',
    diagnosisFiles:   ['Database/ModDiagnosesONCO.xml', 'Database/ModDiagnosesNEURO.xml'],
    symptomFiles:     ['Database/ModSymptoms.xml', 'Database/ModSymptoms_main.xml'],
    examinationFiles: ['Database/ModExaminations.xml'],
    treatmentFiles:   ['Database/ModTreatments.xml', 'Database/ModSurgery.xml'],
    assetFile:        'Database/ModAssetLists.xml',
    locFolders:       ['Database/ModLocalisationWORLD', 'Database/ModLocalisationWORLD_CRP'],
    dependencies: [
      {
        sharedModId:   'mod_crp',
        sharedModName: 'Community Resource Pack',
        folder: 'Game Data/ModdedDepartments/Community Resource Pack',
        locFolders: [
          'Database/ModLocalisation',
          'Database/ModLocalisationSleepy068_Oncology',
        ],
        symptomFiles:     ['Database/ModCRPSymptoms.xml'],
        examinationFiles: ['Database/ModExaminations.xml'],
        treatmentFiles:   ['Database/ModTreatments.xml', 'Database/ModSurgery.xml'],
        assetFile:        'Database/ModAssetLists.xml',
      },
    ],
  },
  {
    id:      'mod_diagnostics',
    name:    'Department of Diagnostics',
    author:  'Ollyver',
    steamUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=3158427011',
    folder: 'Game Data/ModdedDepartments/Deptartment of Diagnostics',
    departments: [
      { id: 'DPT_DEPARTMENTOFDIAGNOSTICS', abbreviation: 'DX', order: 101, colorKey: 'diagnostics' },
    ],
    occurrenceFile:   'Database/ModDepartment/ModDiagnosisOccurrences.xml',
    diagnosisFiles:   ['Database/ModDiagnosesDIAG.xml'],
    symptomFiles:     ['Database/ModSymptoms.xml', 'Database/ModSymptoms_main.xml'],
    examinationFiles: ['Database/ModExaminations.xml'],
    treatmentFiles:   ['Database/ModTreatments.xml', 'Database/ModSurgery.xml'],
    assetFile:        'Database/ModAssetLists.xml',
    locFolders:       ['Database/ModLocalisationCRP', 'Database/ModLocalisationWORLD'],
    dependencies: [
      {
        sharedModId:   'mod_crp',
        sharedModName: 'Community Resource Pack',
        folder: 'Game Data/ModdedDepartments/Community Resource Pack',
        locFolders: ['Database/ModLocalisation'],
        symptomFiles:     ['Database/ModCRPSymptoms.xml'],
        examinationFiles: ['Database/ModExaminations.xml'],
        treatmentFiles:   ['Database/ModTreatments.xml', 'Database/ModSurgery.xml'],
        assetFile:        'Database/ModAssetLists.xml',
      },
    ],
  },

  // ---- Group A: Full-featured standalone mods ----

  {
    id:      'mod_ent',
    name:    'Ear, Nose and Throat Department',
    author:  'James B',
    steamUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=1998013270',
    folder: 'Game Data/ModdedDepartments/ENT Department',
    departments: [
      { id: 'DPT_OTORHINOLARYNGOLOGY', abbreviation: 'ENT', order: 102, colorKey: 'ent' },
    ],
    occurrenceFile:   'Database/ModDiagnoses/ModDiagnosisOccurrences.xml',
    diagnosisFiles:   ['Database/ModDiagnoses/ModDiagnosesOTOR.xml'],
    symptomFiles:     ['Database/ModSymptoms.xml', 'Database/ModSymptoms_main.xml'],
    examinationFiles: ['Database/ModProcedures/ModExaminations.xml'],
    treatmentFiles:   ['Database/ModProcedures/ModTreatments.xml'],
    assetFile:        'Database/ModAssetLists.xml',
    locFolders:       ['Database/ModLocalisation'],
    dependencies: [
      {
        sharedModId:   'mod_crp',
        sharedModName: 'Community Resource Pack',
        folder: 'Game Data/ModdedDepartments/Community Resource Pack',
        locFolders:    ['Database/ModLocalisationJames_ENT'],
      },
    ],
  },

  {
    id:      'mod_obgyn',
    name:    'Department of Gynecology and Obstetrics',
    author:  '| Mac Hareng |',
    steamUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=1920731522',
    folder: 'Game Data/ModdedDepartments/OBGYN',
    departments: [
      { id: 'DPT_GYNECOLOGIE_DEPARTMENT', abbreviation: 'GYN', order: 103, colorKey: 'gynecology' },
    ],
    occurrenceFile:   'Database/ModDiagnosisOccurrences.xml',
    diagnosisFiles:   ['Database/ModDiagnosesGYN.xml'],
    symptomFiles:     ['Database/ModSymptoms.xml', 'Database/ModSymptoms_main.xml'],
    examinationFiles: ['Database/ModExaminations.xml'],
    treatmentFiles:   ['Database/ModTreatments.xml', 'Database/ModSurgery.xml'],
    assetFile:        'Database/ModAssetLists.xml',
    locFolders:       ['Database/ModLocalisation'],
  },

  {
    id:      'mod_plastics',
    name:    'Plastic Surgery Department',
    author:  'Sleepy068',
    steamUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=2137302545',
    folder: 'Game Data/ModdedDepartments/Plastic Surgery',
    departments: [
      { id: 'DPT_PLASTICS', abbreviation: 'PLS', order: 104, colorKey: 'plastic-surgery' },
    ],
    // No occurrenceFile — diagnoses default to rate 100
    diagnosisFiles:   ['Database/ModDiagnosesPLAS.xml'],
    symptomFiles:     ['Database/ModSymptoms.xml', 'Database/ModSymptoms_main.xml'],
    examinationFiles: ['Database/ModExaminations.xml'],
    treatmentFiles:   ['Database/ModTreatments.xml', 'Database/ModSurgeryCosmeticV2.xml', 'Database/ModSurgeryReconstructiveV2.xml'],
    assetFile:        'Database/ModAssetLists.xml',
    locFolders:       ['Database/ModLocalisationCRP', 'Database/ModLocalisationWORLD'],
    dependencies: [
      {
        sharedModId:   'mod_crp',
        sharedModName: 'Community Resource Pack',
        folder: 'Game Data/ModdedDepartments/Community Resource Pack',
        locFolders:    ['Database/ModLocalisationSleepy068_Plastic'],
      },
    ],
  },

  {
    id:      'mod_sexualhealth',
    name:    'Sexual Health Department',
    author:  'Moomin Littlesocks',
    steamUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=1872963449',
    folder: 'Game Data/ModdedDepartments/Sexual Health Department',
    departments: [
      { id: 'DPT_SH', abbreviation: 'SH', order: 105, colorKey: 'sexual-health' },
    ],
    // No occurrenceFile
    diagnosisFiles:   ['Database/ModDiagnoses.xml'],
    symptomFiles:     ['Database/ModSymptoms.xml', 'Database/ModSymptoms_main.xml'],
    examinationFiles: ['Database/ModExaminations.xml'],
    treatmentFiles:   ['Database/ModTreatments.xml'],
    assetFile:        'Database/ModAssetLists.xml',
    locFolders:       ['Database'],  // English string files live at DB root
  },

  {
    id:      'mod_urology',
    name:    'Urology & Nephrology Department',
    author:  'Knabbel',
    steamUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=2137734594',
    folder: 'Game Data/ModdedDepartments/Urology',
    departments: [
      { id: 'DPT_URKN', abbreviation: 'URO', order: 106, colorKey: 'urology' },
    ],
    occurrenceFile:   'Database/ModDiagnosisOccurrences.xml',
    diagnosisFiles:   ['Database/ModDiagnosesUR.xml', 'Database/ModDiagnosesURP.xml', 'Database/ModDiagnosesNF.xml', 'Database/ModDiagnosesTrauma.xml'],
    symptomFiles:     ['Database/ModSymptomsUR.xml', 'Database/ModSymptomsMainUR.xml'],
    examinationFiles: ['Database/ModExamenations.xml'],  // typo in source filename preserved
    treatmentFiles:   ['Database/ModTreatments.xml', 'Database/ModSurgery.xml'],
    assetFile:        'Database/ModAssetListsUR.xml',
    locFolders:       ['Database'],  // English files at DB root, all suffixed UR
  },

  // ---- Group B: Chinese-author mods (Leo / WDZRMPCBIT, no CRP dependency) ----

  {
    id:      'mod_hematology',
    name:    '血液科（Hematology Department)',
    author:  '睿智的狐狸',
    steamUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=3163091222',
    folder: 'Game Data/ModdedDepartments/Hematology Department',
    departments: [
      { id: 'DPT_HEMATOLOGY', abbreviation: 'HEM', order: 107, colorKey: 'hematology' },
    ],
    nativeLang:       'zh-cn',
    occurrenceFile:   'Database/ModDiagnosisOccurrences.xml',
    diagnosisFiles:   ['Database/ModDiagnoses.xml'],
    symptomFiles:     ['Database/ModSymptoms.xml'],
    locFolders:       ['Database/ModLocalization'],
    dependencies: [
      {
        sharedModId:   'mod_ocean',
        sharedModName: 'Ocean Base Package',
        folder: 'Game Data/ModdedDepartments/Ocean Base Package',
        locFolders:       ['Database/ModLocalization'],
        symptomFiles:     ['Database/ModSymptoms.xml'],
        examinationFiles: ['Database/ModExaminations.xml'],
        treatmentFiles:   ['Database/ModTreatments.xml'],
        assetFile:        'Database/ModAssetLists.xml',
      },
    ],
  },

  {
    id:      'mod_psychiatry',
    name:    '新精神卫生（New Psychiatry Department)',
    author:  '月落夕下QAQ, 睿智的狐狸',
    steamUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=3024817031',
    folder: 'Game Data/ModdedDepartments/Psychiatry Department',
    departments: [
      { id: 'DPT_NEW_PSYCHIATRY', abbreviation: 'PSY', order: 108, colorKey: 'psychiatry' },
    ],
    diagnosisFiles:   ['Database/ModDiagnoses.xml'],
    locFolders:       ['Database/ModLocalization'],
    dependencies: [
      {
        sharedModId:   'mod_ocean',
        sharedModName: 'Ocean Base Package',
        folder: 'Game Data/ModdedDepartments/Ocean Base Package',
        locFolders:       ['Database/ModLocalization'],
        symptomFiles:     ['Database/ModSymptoms.xml'],
        examinationFiles: ['Database/ModExaminations.xml'],
        treatmentFiles:   ['Database/ModTreatments.xml'],
        assetFile:        'Database/ModAssetLists.xml',
      },
    ],
  },

  {
    id:      'mod_neuromedicine',
    name:    '神经医学中心（Neuromedicine Center)',
    author:  '睿智的狐狸',
    steamUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=3283738958',
    folder: 'Game Data/ModdedDepartments/Neuromedicine Center',
    // No departments array — mod defines DPT_NEUROLOGY which is already a base-game department.
    // Diagnoses are stamped modId only; they fall under the base-game Neurology toggle.
    nativeLang:            'zh-cn',
    // Explicit override: NMC inherits one English PSY diagnosis (VaD) but is Chinese-primary.
    localizedLanguages:    ['zh-cn'],
    diagnosisFiles:   ['Database/ModDiagnoses.xml'],
    symptomFiles:     ['Database/ModSymptoms.xml'],
    // No examinationFiles, no treatmentFiles, no assetFile
    // locFoldersOverlayOnly: loaded only during non-English locale overlay generation,
    // NOT during Step 1 English loading, to avoid ModStringTableEnSkills.xml which
    // renames the base-game DPT_NEUROLOGY department to "Neuromedicine Center".
    locFoldersOverlayOnly: ['Database/ModLocalization'],
    // Load the English diagnoses file specifically (excluded from locFoldersOverlayOnly above)
    // without loading the EnSkills file that would rename the base-game Neurology department.
    locFiles: ['Database/ModLocalization/ModStringTableEnDiagnoses.xml'],
    dependencies: [
      {
        sharedModId:  'mod_ocean',
        sharedModName: 'Ocean Base Package',
        folder: 'Game Data/ModdedDepartments/Ocean Base Package',
        // asset-only dep: provides icon asset map for NMC diagnosis icons
        // (no data files re-parsed — OBP entities already stamped mod_ocean by HEM/PSY)
        assetFile: 'Database/ModAssetLists.xml',
      },
    ],
  },

  // ---- Group C: Content expansion mods (no new departments) ----

  {
    id:      'mod_procedures',
    name:    'Medical Procedures',
    author:  'James B',
    steamUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=2167731584',
    folder: 'Game Data/ModdedDepartments/Medical Procedures',
    conflictsWith: ['mod_haio'],
    // No departments
    occurrenceFile:   'Database/ModDiagnoses/ModDiagnosisOccurrences.xml',
    diagnosisFiles:   ['Database/ModDiagnoses/ModDiagnosesCHECKUPS.xml'],
    symptomFiles:     ['Database/ModSymptoms.xml', 'Database/ModSymptoms_main.xml'],
    examinationFiles: ['Database/ModProcedures/ModExaminations.xml'],
    treatmentFiles:   ['Database/ModProcedures/ModTreatments.xml'],
    assetFile:        'Database/ModAssetLists.xml',
    locFolders:       ['Database/ModLocalisation'],
  },

  {
    id:      'mod_morediag',
    name:    'More Diagnostics',
    author:  'Butch, | Mac Hareng |',
    steamUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=2015448513',
    folder: 'Game Data/ModdedDepartments/More Diagnostics',
    conflictsWith: ['mod_haio'],
    // No new departments — adds diagnoses to base-game departments
    occurrenceFile:   'Database/ModDiagnosisOccurrences.xml',
    diagnosisFiles:   [
      'Database/ModDiagnosesUE4Neuro.xml',
      'Database/ModDiagnosesUE7Hémato.xml',
      'Database/ModDiagnosesUE8aCardiologie.xml',
      'Database/ModDiagnosesUE8aEndoc.xml',
    ],
    symptomFiles:     ['Database/ModSymptoms.xml', 'Database/ModSymptoms_main.xml'],
    examinationFiles: ['Database/ModExaminations.xml'],
    treatmentFiles:   ['Database/ModTreatments.xml', 'Database/ModSurgery.xml'],
    assetFile:        'Database/ModAssetLists.xml',
    locFolders:       ['Database/ModLocalisation'],
    dependencies: [
      {
        sharedModId:   'mod_crp',
        sharedModName: 'Community Resource Pack',
        folder: 'Game Data/ModdedDepartments/Community Resource Pack',
        locFolders:    ['Database/ModLocalisation'],
        symptomFiles:  ['Database/ModCRPSymptoms.xml'],
        assetFile:     'Database/ModAssetLists.xml',
      },
    ],
  },

  // ---- HAIO: bundles most other mods' departments into one package ----
  // Department-level conflicts are auto-detected; content-level conflicts (mods with no
  // new departments whose content HAIO absorbs) are declared explicitly via conflictsWith.

  {
    id:      'mod_haio',
    name:    'HAO: Hospital All in One!',
    author:  'WDZRMPCBIT',
    steamUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=3554739393',
    folder: 'Game Data/ModdedDepartments/Hospital All in One!',
    // Explicit list: auto-detection over-counts because shared CRP/OBP deps have da/es-la/swe/uk
    // translations that get misattributed to HAIO. Only list languages HAIO ships folders for.
    localizedLanguages: ['cz','de','en','es','fr','hu','it','jp','kr','nl','pl','pt-br','ru','tr','zh-cn','zh-tw'],
    departments: [
      { id: 'DPT_ONCOLOGY',               abbreviation: 'ONC', order: 200, colorKey: 'oncology'        },
      { id: 'DPT_GYNECOLOGIE_DEPARTMENT', abbreviation: 'GYN', order: 201, colorKey: 'gynecology'      },
      { id: 'DPT_PLASTICS',               abbreviation: 'PLS', order: 202, colorKey: 'plastic-surgery' },
      { id: 'DPT_OTORHINOLARYNGOLOGY',    abbreviation: 'ENT', order: 203, colorKey: 'ent'             },
      { id: 'DPT_URKN',                   abbreviation: 'URO', order: 204, colorKey: 'urology',          nameOverride: 'Urology & Nephrology' },
      { id: 'DPT_DEPARTMENTOFDIAGNOSTICS',abbreviation: 'DX',  order: 205, colorKey: 'diagnostics'     },
      { id: 'DPT_NEW_PSYCHIATRY',         abbreviation: 'PSY', order: 206, colorKey: 'psychiatry'      },
      { id: 'DPT_HEMATOLOGY',             abbreviation: 'HEM', order: 207, colorKey: 'hematology'      },
      { id: 'DPT_SH',                     abbreviation: 'SH',  order: 208, colorKey: 'sexual-health',   nameOverride: 'Dermatology & Venereology' },
      { id: 'DPT_OPHTHALMOLOGY',          abbreviation: 'OPH', order: 209, colorKey: 'ophthalmology'   },
      { id: 'DPT_DENTISTRY',              abbreviation: 'DEN', order: 210, colorKey: 'dentistry'       },
    ],
    occurrenceFile: 'Database/ModDiagnosisOccurrences.xml',
    diagnosisFiles: [
      'Database/ModDiagnoses/Cardiology.xml',
      'Database/ModDiagnoses/Dentistry.xml',
      'Database/ModDiagnoses/Dermatology.xml',
      'Database/ModDiagnoses/Diagnostics.xml',
      'Database/ModDiagnoses/GeneralSurgery.xml',
      'Database/ModDiagnoses/Gynecology.xml',
      'Database/ModDiagnoses/Hematology.xml',
      'Database/ModDiagnoses/Hypochondriac.xml',
      'Database/ModDiagnoses/Internal.xml',
      'Database/ModDiagnoses/MedicalProcedure.xml',
      'Database/ModDiagnoses/MoreDiagnostics.xml',
      'Database/ModDiagnoses/Neurology.xml',
      'Database/ModDiagnoses/Oncology.xml',
      'Database/ModDiagnoses/Ophthalmology.xml',
      'Database/ModDiagnoses/Orthopedics.xml',
      'Database/ModDiagnoses/Otorhinolaryngology.xml',
      'Database/ModDiagnoses/Plastic.xml',
      'Database/ModDiagnoses/Psychiatry.xml',
      'Database/ModDiagnoses/SexualHealth.xml',
      'Database/ModDiagnoses/Urology.xml',
    ],
    symptomFiles: [
      'Database/ModSymptoms.xml',
      'Database/ModSymptomsMain/Base.xml',
      'Database/ModSymptomsMain/Dentistry.xml',
      'Database/ModSymptomsMain/Dermatology.xml',
      'Database/ModSymptomsMain/Diagnostics.xml',
      'Database/ModSymptomsMain/Gynecology.xml',
      'Database/ModSymptomsMain/Hematology.xml',
      'Database/ModSymptomsMain/Hypochondriac.xml',
      'Database/ModSymptomsMain/MedicalProcedure.xml',
      'Database/ModSymptomsMain/MoreDiagnostics.xml',
      'Database/ModSymptomsMain/Oncology.xml',
      'Database/ModSymptomsMain/Ophthalmology.xml',
      'Database/ModSymptomsMain/Otorhinolaryngology.xml',
      'Database/ModSymptomsMain/Plastic.xml',
      'Database/ModSymptomsMain/Psychiatry.xml',
      'Database/ModSymptomsMain/SexualHealth.xml',
      'Database/ModSymptomsMain/Urology.xml',
    ],
    examinationFiles: ['Database/ModProcedures/ModExaminations.xml'],
    treatmentFiles:   ['Database/ModProcedures/ModTreatments.xml', 'Database/ModProcedures/ModSurgery.xml'],
    assetFiles: [
      'Database/ModAssetLists/CRP.xml',
      'Database/ModAssetLists/Dentistry.xml',
      'Database/ModAssetLists/Diagnostics.xml',
      'Database/ModAssetLists/Gynecology.xml',
      'Database/ModAssetLists/Hematology.xml',
      'Database/ModAssetLists/Hypochondriac.xml',
      'Database/ModAssetLists/MedicalProcedure.xml',
      'Database/ModAssetLists/MoreDiagnostics.xml',
      'Database/ModAssetLists/Oncology.xml',
      'Database/ModAssetLists/Ophthalmology.xml',
      'Database/ModAssetLists/Otorhinolaryngology.xml',
      'Database/ModAssetLists/Plastic.xml',
      'Database/ModAssetLists/Psychiatry.xml',
      'Database/ModAssetLists/SexualHealth.xml',
      'Database/ModAssetLists/Urology.xml',
    ],
    // Localization is structured as Database/ModLocalisation/{LangPrefix}/ with subdirectories.
    locFolderByLangPrefix: 'Database/ModLocalisation',
  },
];

// ---------------------------------------------------------------------------
// Editorial overrides for modded department display names in non-English locales.
// Applied after locale overlays are generated so source XML files are not modified.
// Rules: no "Department of/Abteilung/Reparto di/…" prefixes; "X & Y" not "X and Y";
// ENT always shown as that language's standard abbreviation; title case throughout.
// ---------------------------------------------------------------------------
const LOCALE_DEPT_NAME_PATCHES = {
  fr: {
    DPT_GYNECOLOGIE_DEPARTMENT:  'Gynécologie & Obstétrique',
    DPT_URKN:                    'Urologie & Nephrologie',
    DPT_DEPARTMENTOFDIAGNOSTICS: 'Diagnostics',
    DPT_DENTISTRY:               'Chirurgie Maxillo-Faciale',
  },
  de: {
    DPT_OTORHINOLARYNGOLOGY:     'HNO',
    DPT_DEPARTMENTOFDIAGNOSTICS: 'Diagnostik',
    DPT_DENTISTRY:               'Mund-, Kiefer- & Gesichtschirurgie',
  },
  es: {
    DPT_OTORHINOLARYNGOLOGY:     'ORL',
    DPT_URKN:                    'Urología & Nefrología',
    DPT_DEPARTMENTOFDIAGNOSTICS: 'Diagnósticos',
    DPT_SH:                      'Salud Sexual',
    DPT_DENTISTRY:               'Cirugía Oral & Maxilofacial',
  },
  it: {
    DPT_OTORHINOLARYNGOLOGY:     'ORL',
    DPT_GYNECOLOGIE_DEPARTMENT:  'Ginecologia & Ostetricia',
    DPT_URKN:                    'Urologia & Nefrologia',
    DPT_ONCOLOGY:                'Oncologia',
    DPT_SH:                      'Dermatologia & Venereologia',
    DPT_DENTISTRY:               'Chirurgia Orale & Maxillo-Facciale',
  },
  'pt-br': {
    DPT_OTORHINOLARYNGOLOGY:     'ORL',
    DPT_URKN:                    'Urologia & Nefrologia',
    DPT_DEPARTMENTOFDIAGNOSTICS: 'Diagnósticos',
    DPT_DENTISTRY:               'Odontologia & Cirurgia Maxilofacial',
  },
  nl: {
    DPT_OTORHINOLARYNGOLOGY:     'KNO',
    DPT_URKN:                    'Urologie & Nefrologie',
    DPT_DEPARTMENTOFDIAGNOSTICS: 'Diagnostiek',
    DPT_SH:                      'Seksuele Gezondheid',
    DPT_DENTISTRY:               'Mond-, Kaak- & Aangezichtschirurgie',
  },
  pl: {
    DPT_OTORHINOLARYNGOLOGY:     'ORL',
    DPT_URKN:                    'Urologia & Nefrologia',
    DPT_DEPARTMENTOFDIAGNOSTICS: 'Diagnostyka',
    DPT_DENTISTRY:               'Chirurgia Szczękowo-Twarzowa',
  },
  ru: {
    DPT_OTORHINOLARYNGOLOGY:     'ЛОР',
    DPT_URKN:                    'Урология & Нефрология',
    DPT_DEPARTMENTOFDIAGNOSTICS: 'Диагностика',
    DPT_DENTISTRY:               'Челюстно-лицевая Хирургия',
  },
  tr: {
    DPT_OTORHINOLARYNGOLOGY:     'KBB',
    DPT_GYNECOLOGIE_DEPARTMENT:  'Jinekoloji & Obstetrik',
    DPT_URKN:                    'Üroloji & Nefroloji',
    DPT_DEPARTMENTOFDIAGNOSTICS: 'Tanı',
    DPT_PLASTICS:                'Plastik Cerrahi',
    DPT_DENTISTRY:               'Ağız & Maksillofasiyal Cerrahi',
  },
  cz: {
    DPT_OTORHINOLARYNGOLOGY:     'ORL',
    DPT_URKN:                    'Urologie & Nefrologie',
    DPT_DEPARTMENTOFDIAGNOSTICS: 'Diagnostika',
    DPT_PLASTICS:                'Plastická Chirurgie',
    DPT_DENTISTRY:               'Orální & Maxilofaciální Chirurgie',
  },
  hu: {
    DPT_URKN:                    'Urológia & Nefrológia',
    DPT_DEPARTMENTOFDIAGNOSTICS: 'Diagnosztika',
    DPT_SH:                      'Szexuális Egészség',
    DPT_DENTISTRY:               'Arc- & Szájsebészet',
  },
};

// ---------------------------------------------------------------------------
// Department color palette — one hex value per department ID.
// Used by the UI for filter chips, badges, and diagnosis cards.
// ---------------------------------------------------------------------------
const DEPT_COLORS = {
  // Base game
  DPT_EMERGENCY:                      '#E53935',
  DPT_GENERAL_SURGERY_DEPARTMENT:     '#1E88E5',
  DPT_INTERNAL_MEDICINE_DEPARTMENT:   '#43A047',
  DPT_ORTHOPAEDICS_AND_TRAUMATOLOGY:  '#FB8C00',
  DPT_CARDIOLOGY:                     '#E91E63',
  DPT_NEUROLOGY:                      '#8E24AA',
  DPT_INFECTIOUS_DISEASES_DEPARTMENT: '#00ACC1',
  DPT_TRAUMATOLOGY_DEPARTMENT:        '#6D4C41',
  // Mods
  DPT_ONCOLOGY:                       '#78909C',
  DPT_DEPARTMENTOFDIAGNOSTICS:        '#F57F17',
  DPT_OTORHINOLARYNGOLOGY:            '#33691E',
  DPT_GYNECOLOGIE_DEPARTMENT:         '#C2185B',
  DPT_PLASTICS:                       '#7E57C2',
  DPT_SH:                             '#D84315',
  DPT_URKN:                           '#3949AB',
  DPT_HEMATOLOGY:                     '#C62828',
  DPT_NEW_PSYCHIATRY:                 '#00695C',
  DPT_OPHTHALMOLOGY:                  '#5C6BC0',
  DPT_DENTISTRY:                      '#F9A825',
};

// ---------------------------------------------------------------------------
// Step 1: Merge all English localization files into a flat string map
// ---------------------------------------------------------------------------
console.log('Building localization map...');
const strings = {};
const _modNativeStrings = {}; // modId → string map in the mod's native language
const _perModEnStrings  = {}; // modId → isolated English strings (not merged into global map)
const _realEnDiagIds = new Set(); // diagnosis entity IDs that resolved a real English string

function mergeLocFile(filePath, target = strings) {
  const parsed = parseXml(filePath);
  if (!parsed) return;
  const db = parsed.Database;
  if (!db) return;

  // Handle both single table and multiple tables
  const tables = db.GameDBStringTable ? [].concat(db.GameDBStringTable) : [];
  for (const table of tables) {
    const locStrings = table?.LocalizedStrings?.GameDBLocalizedString;
    if (!locStrings) continue;
    for (const entry of locStrings) {
      if (entry.LocID && entry.Text !== undefined) {
        target[entry.LocID] = String(entry.Text);
      }
    }
  }
}

const LOC_FILES = [
  'Game Data/BaseGame/Localization/en/StringTableEnDiagnoses.xml',
  'Game Data/BaseGame/Localization/en/StringTableEnExaminations.xml',
  'Game Data/BaseGame/Localization/en/StringTableEnSymptoms.xml',
  'Game Data/BaseGame/Localization/en/StringTableEnSymptomsDLCShared.xml',
  'Game Data/BaseGame/Localization/en/StringTableEnTreatments.xml',
  'Game Data/BaseGame/Localization/en/StringTableEnPatch_1_1.xml',
  'Game Data/BaseGame/Localization/en/StringTableEnPatch_1_1_19.xml',
  'Game Data/BaseGame/Localization/en/StringTableEnPatch_1_1_24.xml',
  'Game Data/BaseGame/Localization/en/StringTableEnPatch_1_2_30.xml',
  'Game Data/DLCInfectiousDiseases/Localization/en/StringTableEnDLCInfectiousDiseases.xml',
  'Game Data/DLCTraumatology/Localization/en/StringTableEnDLCTraumatology.xml',
  'Game Data/DLCTraumatology/Localization/en/StringTableEnDLCTraumatologyWheelchairs.xml',
  'Game Data/BaseGame/Localization/en/StringTableEnBuildingMode.xml',
  'Game Data/BaseGame/Localization/en/StringTableEnSkills.xml',
  'Game Data/BaseGame/Localization/en/StringTableEnCharacters.xml',
];

for (const f of LOC_FILES) mergeLocFile(p(f));

// Load English localization from each mod's ModLocalisationEN folder + any extraLocFolders
for (const mod of MODS) {
  const locDir = path.join(ROOT, mod.folder.replace(/\//g, path.sep), 'Database', 'ModLocalisationEN');
  if (fs.existsSync(locDir)) {
    for (const f of fs.readdirSync(locDir).sort()) {
      if (f.endsWith('.xml')) mergeLocFile(path.join(locDir, f));
    }
  }
  for (const extraFolder of (mod.extraLocFolders || [])) {
    const extraDir = path.join(ROOT, mod.folder.replace(/\//g, path.sep), extraFolder.replace(/\//g, path.sep));
    if (fs.existsSync(extraDir)) {
      for (const f of fs.readdirSync(extraDir).sort()) {
        if (f.endsWith('.xml')) mergeLocFile(path.join(extraDir, f));
      }
    }
  }
  // locFolders: reads only ModStringTableEn*.xml, safe for mixed-language folders
  for (const locFolder of (mod.locFolders || [])) {
    const locDir = path.join(ROOT, mod.folder.replace(/\//g, path.sep), locFolder.replace(/\//g, path.sep));
    if (fs.existsSync(locDir)) {
      for (const f of fs.readdirSync(locDir).filter(f => f.startsWith('ModStringTableEn') && f.endsWith('.xml')).sort()) {
        mergeLocFile(path.join(locDir, f));
      }
    }
  }
  // locFolderByLangPrefix: recursively scan Database/ModLocalisation/En/ for ModStringTableEn*.xml.
  // Loaded into a per-mod isolated map (NOT the global strings) to prevent contaminating
  // standalone mods' entity names and localizedLanguages detection. The strings are temporarily
  // merged into global strings only during this mod's own entity parsing window (Step 6c).
  if (mod.locFolderByLangPrefix) {
    const enDir = path.join(ROOT, mod.folder.replace(/\//g, path.sep),
      mod.locFolderByLangPrefix.replace(/\//g, path.sep), 'En');
    const modEnStrings = {};
    for (const absPath of scanXmlRecursive(enDir)) {
      if (path.basename(absPath).startsWith('ModStringTableEn') && absPath.endsWith('.xml')) {
        mergeLocFile(absPath, modEnStrings);
      }
    }
    if (Object.keys(modEnStrings).length > 0) {
      _perModEnStrings[mod.id] = modEnStrings;
    }
  }
  // locFiles: load specific English localization files by path (avoids loading
  // unwanted files in the same folder, e.g. NMC's EnSkills that renames DPT_NEUROLOGY).
  for (const locFile of (mod.locFiles || [])) {
    const fp = path.join(ROOT, mod.folder.replace(/\//g, path.sep), locFile.replace(/\//g, path.sep));
    if (fs.existsSync(fp)) mergeLocFile(fp);
  }
  // dep.locFolders: load English strings from each dependency's loc folders.
  // Must happen in Step 1 (before any entity is parsed) so that shared-dep entity
  // names (e.g. CRP ENT-specific symptoms) are resolved before the first mod that
  // parses CRP data files (Oncology) runs in Step 5.
  for (const dep of (mod.dependencies || [])) {
    for (const locFolder of (dep.locFolders || [])) {
      const depLocDir = path.join(ROOT, dep.folder.replace(/\//g, path.sep), locFolder.replace(/\//g, path.sep));
      if (fs.existsSync(depLocDir)) {
        for (const f of fs.readdirSync(depLocDir).filter(f => f.startsWith('ModStringTableEn') && f.endsWith('.xml')).sort()) {
          mergeLocFile(path.join(depLocDir, f));
        }
      }
    }
  }
}
console.log(`  ${Object.keys(strings).length} strings loaded`);

// ---------------------------------------------------------------------------
// Step 1b: Load native-language strings for mods that declare nativeLang.
// Used as display-name fallback so Chinese-author mods show real names instead
// of humanized entity IDs (e.g. "肌萎缩侧索硬化" instead of "Als").
// ---------------------------------------------------------------------------
for (const mod of MODS) {
  if (!mod.nativeLang) continue;
  const prefix = NATIVE_LANG_PREFIXES[mod.nativeLang];
  if (!prefix) continue;
  const ns = {};
  const loadNative = (fp) => {
    const parsed = parseXml(fp);
    if (!parsed) return;
    const tables = parsed?.Database?.GameDBStringTable ? [].concat(parsed.Database.GameDBStringTable) : [];
    for (const table of tables) {
      for (const entry of (table?.LocalizedStrings?.GameDBLocalizedString || [])) {
        if (entry.LocID && entry.Text !== undefined) ns[entry.LocID] = String(entry.Text);
      }
    }
  };
  for (const lf of [...(mod.locFolders || []), ...(mod.locFoldersOverlayOnly || [])]) {
    const dir = path.join(ROOT, mod.folder.replace(/\//g, path.sep), lf.replace(/\//g, path.sep));
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter(f => f.startsWith(`ModStringTable${prefix}`) && f.endsWith('.xml')).sort()) {
      loadNative(path.join(dir, f));
    }
  }
  if (Object.keys(ns).length > 0) {
    _modNativeStrings[mod.id] = ns;
    console.log(`  "${mod.id}": ${Object.keys(ns).length} ${mod.nativeLang} native strings loaded`);
  }
}

// Maps room tag IDs (from XML RequiredRoomTags) → BuildingMode/DLC LocIDs
const ROOM_TAG_LOC_IDS = {
  burn_unit:                     'ROOM_TYPE_BURN_UNIT',
  cardio_unit:                   'ROOM_TYPE_CARDIOVASCULAR_DIAGNOSTIC_UNIT_GS',
  cardio_unit_car:               'ROOM_TYPE_CARDIOVASCULAR_DIAGNOSTIC_UNIT_CAR',
  cardio_unit_gs:                'ROOM_TYPE_CARDIOVASCULAR_DIAGNOSTIC_UNIT_GS',
  cardio_unit_im:                'ROOM_TYPE_CARDIOVASCULAR_DIAGNOSTIC_UNIT_IM',
  cardiology_office:             'ROOM_TYPE_CARDIOLOGY_OFFICE',
  did_inpatient_office:          'ROOM_TYPE_INPATIENT_DID_OFFICE',
  emergency_doctors_office:      'ROOM_TYPE_DOCTORS_OFFICE',
  general_surgery_office:        'ROOM_TYPE_GENERAL_SURGERY_OFFICE',
  gs_inpatient_office:           'ROOM_TYPE_INPATIENT_GS_OFFICE',
  gs_sonography_unit:            'ROOM_TYPE_DIAGNOSTIC_SONOGRAPHY_UNIT_GS',
  hematology_lab:                'ROOM_TYPE_HEMATOLOGY_LAB_DID',
  histology_lab:                 'ROOM_TYPE_HISTOLOGY_LAB',
  hospitalization_high:          'ROOM_TYPE_HIGH_PRIORITY_INPATIENT_WARD',
  hospitalization_normal:        'ROOM_TYPE_INPATIENT_WARD',
  icu:                           'ROOM_TYPE_INTENSIVE_CARE_UNIT',
  im_inpatient_office:           'ROOM_TYPE_INPATIENT_IM_OFFICE',
  im_unique_office:              'ROOM_TYPE_INTERNAL_MEDICINE_OFFICE',
  infectious_diseases_office:    'ROOM_TYPE_INFECTIOUS_DISEASES_OFFICE',
  internal_medicine_office:      'ROOM_TYPE_INTERNAL_MEDICINE_OFFICE',
  microbiology_lab:              'ROOM_TYPE_MICROBIOLOGY_LAB',
  neurology_inpatient_office:    'ROOM_TYPE_INPATIENT_NEUROLOGY_OFFICE',
  neurology_office:              'ROOM_TYPE_NEUROLOGY_OFFICE',
  neurology_unit:                'ROOM_TYPE_NEURODIAGNOSTIC_UNIT_NE',
  observation:                   'ROOM_TYPE_ER_OBSERVATION_ROOM',
  operating_room:                'ROOM_TYPE_OPERATING_ROOM',
  orthopaedy_inpatient_office:   'ROOM_TYPE_INPATIENT_OT_OFFICE',
  orthopaedy_office:             'ROOM_TYPE_ORTHOPAEDICS_OFFICE',
  receipt:                       'ROOM_TYPE_RECEPTION',
  room_angiography:              'ROOM_TYPE_ANGIOGRAPHY_ROOM',
  room_ct:                       'ROOM_TYPE_CT_ROOM',
  room_mri:                      'ROOM_TYPE_MRI_ROOM',
  room_x_ray:                    'ROOM_TYPE_X_RAY_ROOM',
  sonography_unit:               'ROOM_TYPE_DIAGNOSTIC_SONOGRAPHY_UNIT_GS',
  trauma_center:                 'ROOM_TYPE_TRAUMA_CENTER',
  traumatology_inpatient_office: 'ROOM_TYPE_INPATIENT_TRAUMATOLOGY_OFFICE',
  traumatology_office:           'ROOM_TYPE_TRAUMATOLOGY_OFFICE',
  ward:                          'ROOM_TYPE_INPATIENT_WARD',
};

// Room tags with no game LocID — always English
const ROOM_TAG_STATIC = {
  any_inpatient_office:          'Any Inpatient Office',
  any_outpatient_office:         'Any Outpatient Office',
  deprecated_lab:                'Lab',
  diag_office:                   'Diagnostics Office',
  examinations_basic_equipment:  'Any Office (with Equipment)',
  examinations_no_equipment:     'Any Office',
  only_clinic:                   'Outpatient Only',
};

function toTitleCase(str) {
  if (!str) return str;
  // Use Unicode letter property so accented chars (é, ü, etc.) are treated as
  // part of words rather than breaking word boundaries like ASCII \b does.
  return str.replace(/(^|[\s\-])(\p{L})/gu, (_, sep, letter) => sep + letter.toUpperCase());
}

// Per-language hard overrides for specific department names that the game string
// is unsuitable for (too long, wrong form, etc.). Applied after stripping.
const DEPT_NAME_OVERRIDES = {
  en: {
    DPT_OTORHINOLARYNGOLOGY: 'ENT',
    DPT_URKN:                'Urology & Nephrology',
    DPT_DENTISTRY:           'Oral & Maxillofacial',
  },
  es: {
    DPT_ORTHOPAEDICS_AND_TRAUMATOLOGY: 'Ortopedia',
  },
};

// Per-language patterns to strip the "Department" / equivalent word from dept names.
// Prefixes are tried longest-first; a single suffix is matched at the end.
const DEPT_STRIP_PATTERNS = {
  en:      { prefixes: ['Department of '],                                     suffixes: [' Department'] },
  fr:      { prefixes: ['Département de ', "Département d'", 'Département '],  suffixes: [] },
  it:      { prefixes: ['Dipartimento di ', 'Dipartimento '],                  suffixes: [] },
  pl:      { prefixes: ['Oddział '],                                           suffixes: [] },
  ru:      { prefixes: ['Отделение '],                                         suffixes: [] },
  cz:      { prefixes: [],                                                     suffixes: [' oddělení'] },
  da:      { prefixes: [],                                                     suffixes: [' afdeling'] },
  swe:     { prefixes: [],                                                     suffixes: [' avdelningen'] },
  'es-la': { prefixes: ['Departamento de ', 'Departamento '],                  suffixes: [] },
  'zh-tw': { prefixes: [],                                                     suffixes: ['部'] },
};

function stripDeptWord(name, lang) {
  if (!name) return name;
  const patterns = DEPT_STRIP_PATTERNS[lang];
  if (!patterns) return name;
  let s = name.trim();
  let stripped = false;
  for (const prefix of (patterns.prefixes || [])) {
    if (s.startsWith(prefix)) { s = s.slice(prefix.length).trim(); stripped = true; break; }
  }
  if (!stripped) {
    for (const suffix of (patterns.suffixes || [])) {
      if (s.endsWith(suffix)) { s = s.slice(0, s.length - suffix.length).trim(); stripped = true; break; }
    }
  }
  // Capitalize the first letter when stripping left it lowercase
  return stripped && s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Build asset ID → PNG filename map from a mod's asset list XML.
// Only keeps TEXTURE_CUSTOM_SPRITE entries; strips only the MOD_ROOT/ prefix so
// the subdirectory structure is preserved for correct file-copy source paths.
function parseAssetLists(filePath) {
  const parsed = parseXml(filePath);
  if (!parsed) return {};
  const map = {};
  for (const asset of (parsed?.Database?.GameDBAsset || [])) {
    const id = asset['@_ID'];
    const file = asset.File;
    if (id && file && asset.Type === 'TEXTURE_CUSTOM_SPRITE') {
      map[id] = String(file).replace(/^MOD_ROOT\//, '');
    }
  }
  return map;
}

// Derive display name from a locID like "DIA_SLM_DESCRIPTION" → lookup "DIA_SLM"
// Also handles mod-style "_DESC" suffix (e.g. "DIA_ONCO_X_DESC" → "DIA_ONCO_X")
// Falls back to stripping _V2/_V3 variant suffixes, then to the entity's own ID as a LocID.
// entityId fallback handles cases where the mod stores the name under the entity ID itself
// (e.g. DIA_FIBROME_SM, DIA_PLAS_C_BREAST_01_V2, DIA_RUPTURE_KYSTE_OVARIEN).
// Last resort: humanize the entity ID (e.g. "DIA_NMC_NEUROFIBROMATOSIS" → "Neurofibromatosis")
// so mods without English translations show readable names instead of raw IDs.
function getName(locId, entityId) {
  if (!locId) return (entityId && strings[entityId]) ? toTitleCase(strings[entityId]) : (locId || entityId || '');
  const nameKey = locId.replace(/_DESC(?:RIPTION)?.*$/i, '');
  const name = strings[nameKey] || strings[nameKey.replace(/_V\d+$/, '')] || (entityId ? strings[entityId] : undefined);
  if (name) return toTitleCase(name);
  // Humanize entity ID: strip type prefix + one optional namespace segment, then title-case.
  // E.g. "DIA_NMC_NEUROFIBROMATOSIS" → "Neurofibromatosis", "DIA_HEM_HCL" → "Hcl"
  const humanId = entityId || nameKey;
  const humanized = humanId
    .replace(/^[A-Z]{2,4}_(?:[A-Z0-9]{2,8}_)?/, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
  return humanized || nameKey;
}
function getDesc(locId) {
  if (!locId) return '';
  return strings[locId] || '';
}

// ---------------------------------------------------------------------------
// Locale ID tracking for overlay generation (not written to output JSON)
// ---------------------------------------------------------------------------
const _diagLocIds = {}; // diagId  -> abbrevLocId
const _symLocIds  = {}; // symId   -> { locId, isStub }
const _examLocIds = {}; // examId  -> abbrevLocId
const _trtLocIds  = {}; // trtId   -> { abbrevLocId, isStub }

// ---------------------------------------------------------------------------
// Step 2: Parse occurrences
// ---------------------------------------------------------------------------
console.log('Parsing occurrences...');
const occurrences = {};
const occParsed = parseXml(p('Game Data/BaseGame/DiagnosisOccurrences.xml'));
for (const occ of (occParsed?.Database?.GameDBDiagnosisOccurrence || [])) {
  occurrences[occ['@_ID']] = { id: occ['@_ID'], rate: Number(occ.OccurrenceRate) };
}
for (const mod of MODS) {
  if (!mod.occurrenceFile) continue;
  const modOccParsed = parseXml(p(`${mod.folder}/${mod.occurrenceFile}`));
  for (const occ of (modOccParsed?.Database?.GameDBDiagnosisOccurrence || [])) {
    occurrences[occ['@_ID']] = { id: occ['@_ID'], rate: Number(occ.OccurrenceRate) };
  }
}
console.log(`  ${Object.keys(occurrences).length} occurrences`);

// ---------------------------------------------------------------------------
// Step 3: Parse symptoms
// ---------------------------------------------------------------------------
console.log('Parsing symptoms...');
const symptoms = {};

const REMOVED_SYMPTOMS = new Set(['SYM_SHORTNESS_OF_BREATH', 'SYM_SWELLING_FOOT']);

function parseSymptomFile(filePath, modId = null, assetMap = {}) {
  const parsed = parseXml(filePath);
  if (!parsed) return;
  for (const sym of (parsed?.Database?.GameDBSymptom || [])) {
    const id = sym['@_ID'];
    if (!id || REMOVED_SYMPTOMS.has(id)) continue;
    if (modId && symptoms[id]) {
      if (!symptoms[id].modId || symptoms[id].modId === modId) continue;
      // Different mod already owns this symptom — record co-ownership instead of overwriting.
      const ex = symptoms[id];
      if (!ex.modIds) ex.modIds = [ex.modId];
      if (!ex.modIds.includes(modId)) ex.modIds.push(modId);
      continue;
    }
    const descLocId = sym.DescriptionLocID || '';
    const _modIconPath = assetMap[sym.CustomIconSmallAssetRef] || assetMap[sym.CustomIconBigAssetRef] || null;
    const modIcon = _modIconPath ? path.basename(_modIconPath) : null;
    symptoms[id] = {
      id,
      name: getName(descLocId) || id,
      description: getDesc(descLocId),
      discomfortLevel: sym.DiscomfortLevel || 'None',
      hazard: sym.Hazard || 'Low',
      patientComplains: sym.PatientComplains === true || sym.PatientComplains === 'true',
      isMainSymptom: sym.IsMainSymptom === true || sym.IsMainSymptom === 'true',
      iconIndex: Number(sym.IconIndex) || 0,
      examinations: toArray(sym?.Examinations?.ExaminationRef),
      treatments: toArray(sym?.Treatments?.TreatmentRef),
      collapseSymptomRef: sym.CollapseSymptomRef || null,
      riskOfCollapseStartHours: sym.RiskOfCollapseStartHours != null ? Number(sym.RiskOfCollapseStartHours) : null,
      riskOfCollapseEndHours: sym.RiskOfCollapseEndHours != null ? Number(sym.RiskOfCollapseEndHours) : null,
      riskOfDeathStartHours: sym.RiskOfDeathStartHours != null ? Number(sym.RiskOfDeathStartHours) : null,
      riskOfDeathEndHours: sym.RiskOfDeathEndHours != null ? Number(sym.RiskOfDeathEndHours) : null,
      shameLevel: sym.ShameLevel != null ? Number(sym.ShameLevel) : 0,
      patientMobility: sym.PatientMobility || 'MOBILE',
      canNotTalk: sym.CanNotTalk === true || sym.CanNotTalk === 'true',
      ...(modId ? { modId } : {}),
      ...(modIcon ? { modIcon } : {}),
    };
    _symLocIds[id] = { locId: descLocId, isStub: false };
  }
}

const SYMPTOM_FILES = [
  'Game Data/BaseGame/Symptoms.xml',
  'Game Data/BaseGame/Symptoms_main.xml',
  'Game Data/BaseGame/SymptomsDLCShared.xml',
  'Game Data/DLCInfectiousDiseases/DLCSymptomsMain.xml',
  'Game Data/DLCInfectiousDiseases/DLCSymptoms.xml',
  'Game Data/DLCTraumatology/DLCSymptomsMain.xml',
  'Game Data/DLCTraumatology/DLCSymptoms.xml',
];

for (const f of SYMPTOM_FILES) parseSymptomFile(p(f));
console.log(`  ${Object.keys(symptoms).length} symptoms`);

// ---------------------------------------------------------------------------
// Step 4: Parse examinations
// ---------------------------------------------------------------------------
console.log('Parsing examinations...');
const examinations = {};

function parseExamFile(filePath, modId = null, assetMap = {}) {
  const parsed = parseXml(filePath);
  if (!parsed) return;
  for (const ex of (parsed?.Database?.GameDBExamination || [])) {
    const id = ex['@_ID'];
    if (!id) continue;
    if (modId && examinations[id]) {
      if (!examinations[id].modId || examinations[id].modId === modId) continue;
      const ex = examinations[id];
      if (!ex.modIds) ex.modIds = [ex.modId];
      if (!ex.modIds.includes(modId)) ex.modIds.push(modId);
      continue;
    }
    const abbrevLocId = ex.AbbreviationLocID || '';
    const _modIconPath = assetMap[ex.CustomIconSmallAssetRef] || assetMap[ex.CustomIconBigAssetRef] || null;
    const modIcon = _modIconPath ? path.basename(_modIconPath) : null;
    examinations[id] = {
      id,
      name: toTitleCase(strings[id]) || getName(abbrevLocId) || id,
      description: getDesc(abbrevLocId),
      examinationType: ex.ExaminationType || 'EXAMINATION',
      cost: Number(ex.Cost) || 0,
      iconIndex: Number(ex.IconIndex) || 0,
      labTestingExaminationRef: ex.LabTestingExaminationRef || null,
      discomfortLevel: ex.DiscomfortLevel || 'None',
      patientNeedsToBeAbleToTalk: ex.PatientNeedsToBeAbleToTalk === true || ex.PatientNeedsToBeAbleToTalk === 'true',
      requiredRoomTags: toArray(ex?.Procedure?.RequiredRoomTags?.Tag),
      ...(modId ? { modId } : {}),
      ...(modIcon ? { modIcon } : {}),
    };
    _examLocIds[id] = abbrevLocId;
  }
}

const EXAM_FILES = [
  'Game Data/BaseGame/Examinations.xml',
  'Game Data/BaseGame/ExaminationsReception.xml',
  'Game Data/DLCInfectiousDiseases/DLCExaminations.xml',
  'Game Data/DLCTraumatology/DLCExaminations.xml',
];

for (const f of EXAM_FILES) parseExamFile(p(f));
console.log(`  ${Object.keys(examinations).length} examinations`);

// ---------------------------------------------------------------------------
// Step 5: Parse treatments
// ---------------------------------------------------------------------------
console.log('Parsing treatments...');
const treatments = {};

function parseTreatmentFile(filePath, modId = null, assetMap = {}) {
  const parsed = parseXml(filePath);
  if (!parsed) return;
  for (const trt of (parsed?.Database?.GameDBTreatment || [])) {
    const id = trt['@_ID'];
    if (!id) continue;
    if (modId && treatments[id]) {
      if (!treatments[id].modId || treatments[id].modId === modId) continue;
      const ex = treatments[id];
      if (!ex.modIds) ex.modIds = [ex.modId];
      if (!ex.modIds.includes(modId)) ex.modIds.push(modId);
      continue;
    }
    const abbrevLocId = trt.AbbreviationLocID || '';
    const _modIconPath = assetMap[trt.CustomIconSmallAssetRef] || assetMap[trt.CustomIconBigAssetRef] || null;
    const modIcon = _modIconPath ? path.basename(_modIconPath) : null;
    treatments[id] = {
      id,
      name: getName(abbrevLocId) || id,
      description: getDesc(abbrevLocId),
      treatmentType: trt.TreatmentType || 'PRESCRIPTION',
      cost: Number(trt.Cost) || 0,
      iconIndex: Number(trt.IconIndex) || 0,
      discomfortLevel: trt.DiscomfortLevel || 'None',
      pharmacyPickup: trt.PharmacyPickup === true || trt.PharmacyPickup === 'true',
      requiredRoomTags: toArray(trt?.Procedure?.RequiredRoomTags?.Tag),
      complications: (trt?.Procedure?.Complications?.Complication || []).map(c => ({
        symptomRef: c.SymptomRef || '',
        probabilityPercent: Number(c.ProbabilityPercent) || 0,
        probabilityPercentMaxSkillLevel: Number(c.ProbabilityPercentMaxSkillLevel) || 0,
      })),
      ...(modId ? { modId } : {}),
      ...(modIcon ? { modIcon } : {}),
    };
    _trtLocIds[id] = { abbrevLocId, isStub: false };
  }
}

const TREATMENT_FILES = [
  'Game Data/BaseGame/Treatments.xml',
  'Game Data/BaseGame/Surgery.xml',
  'Game Data/BaseGame/TreatmentsHospitalization.xml',
  'Game Data/DLCInfectiousDiseases/DLCTreatments.xml',
  'Game Data/DLCTraumatology/DLCTreatments.xml',
  'Game Data/DLCTraumatology/DLCSurgery.xml',
];

for (const f of TREATMENT_FILES) parseTreatmentFile(p(f));
console.log(`  ${Object.keys(treatments).length} treatments`);

// ---------------------------------------------------------------------------
// Step 6: Parse diagnoses
// ---------------------------------------------------------------------------
console.log('Parsing diagnoses...');
const diagnoses = {};

function parseDiagnosisFile(filePath, modId = null, assetMap = {}, nativeStrings = null) {
  const parsed = parseXml(filePath);
  if (!parsed) return;
  for (const cond of (parsed?.Database?.GameDBMedicalCondition || [])) {
    const id = cond['@_ID'];
    if (!id) continue;
    if (cond.Disabled === true || cond.Disabled === 'true') continue;
    const abbrevLocId = cond.AbbreviationLocID || '';
    const _modIconPath = assetMap[cond.CustomIconSmallAssetRef] || assetMap[cond.CustomIconBigAssetRef] || null;
    const modIcon = _modIconPath ? path.basename(_modIconPath) : null;
    const rawSymptoms = (cond?.Symptoms?.GameDBSymptomRules || []).map(sr => ({
      symptomRef: sr.GameDBSymptomRef || '',
      probability: Number(sr.ProbabilityPercent) || 0,
      dayOfFirstOccurrence: sr.DayOfFirstOccurence != null ? Number(sr.DayOfFirstOccurence) : null,
    })).filter(s => s.symptomRef && s.probability > 0);

    // Name resolution: English strings take priority. If absent and a nativeStrings
    // map is provided (for Chinese-author mods), use native text instead of humanizing.
    const nameKey = abbrevLocId.replace(/_DESC(?:RIPTION)?.*$/i, '');
    const enNameStr = strings[nameKey] || strings[nameKey.replace(/_V\d+$/, '')] || (id ? strings[id] : undefined);
    let diagName, diagDesc;
    if (enNameStr) {
      diagName = toTitleCase(enNameStr);
      diagDesc = strings[abbrevLocId] || '';
    } else if (nativeStrings) {
      const nativeName = nativeStrings[nameKey] || nativeStrings[nameKey.replace(/_V\d+$/, '')] || (id ? nativeStrings[id] : undefined);
      diagName = nativeName != null ? String(nativeName) : getName(abbrevLocId, id);
      diagDesc = nativeStrings[abbrevLocId] || '';
    } else {
      diagName = getName(abbrevLocId, id);
      diagDesc = getDesc(abbrevLocId);
    }

    const entry = {
      name: diagName,
      description: diagDesc,
      duration: Number(cond.Duration) || 0,
      occurrenceRef: cond.OccurrenceRef || '',
      occurrenceRate: occurrences[cond.OccurrenceRef]?.rate ?? 100,
      departmentRef: cond.DepartmentRef || '',
      insurancePayment: Number(cond.InsurancePayment) || 0,
      iconIndex: Number(cond.IconIndex) || 0,
      tags: toArray(cond?.Tags?.Tag),
      symptoms: rawSymptoms,
      examinations: toArray(cond?.Examinations?.ExaminationRef),
      treatments: toArray(cond?.Treatments?.TreatmentRef),
      ...(modId ? { modId } : {}),
      ...(modIcon ? { modIcon } : {}),
    };

    if (modId && diagnoses[id] && !diagnoses[id].modId) {
      // Mod redefines a base-game diagnosis (e.g. to move it to a new department).
      // Store the mod's version under a compound key so both can coexist.
      // The base-game version is shown when the mod is disabled; the mod version
      // when it's enabled. isEntityVisible() enforces the mutual exclusivity.
      const overrideKey = `${id}__${modId}`;
      diagnoses[overrideKey] = { id: overrideKey, baseGameId: id, ...entry };
      if (!diagnoses[id].overriddenBy) diagnoses[id].overriddenBy = [];
      if (!diagnoses[id].overriddenBy.includes(modId)) diagnoses[id].overriddenBy.push(modId);
      _diagLocIds[overrideKey] = abbrevLocId;
    } else if (modId && diagnoses[id] && diagnoses[id].modId && diagnoses[id].modId !== modId) {
      // Diagnosis already owned by a different mod. Create a parallel entry keyed as
      // {id}__{modId} so each mod's version carries its own name and language independently.
      // Each entry is only visible when its owning modId is enabled — mutual exclusivity
      // between conflicting mods (HAIO vs. standalone) is enforced by the conflict UI.
      const modKey = `${id}__${modId}`;
      if (!diagnoses[modKey]) {
        diagnoses[modKey] = { id: modKey, ...entry };
        _diagLocIds[modKey] = abbrevLocId;
        if (enNameStr) _realEnDiagIds.add(modKey);
      }
    } else {
      diagnoses[id] = { id, ...entry };
      _diagLocIds[id] = abbrevLocId;
      if (modId && enNameStr) _realEnDiagIds.add(id);
    }
  }
}

const DIAGNOSIS_FILES = [
  'Game Data/BaseGame/DiagnosesER.xml',
  'Game Data/BaseGame/DiagnosesINTERN.xml',
  'Game Data/BaseGame/DiagnosesCARDIO.xml',
  'Game Data/BaseGame/DiagnosesNEURO.xml',
  'Game Data/BaseGame/DiagnosesORTHO.xml',
  'Game Data/BaseGame/DiagnosesSURG.xml',
  'Game Data/DLCInfectiousDiseases/DiagnosesINFECT.xml',
  'Game Data/DLCTraumatology/DiagnosesTRAUMA.xml',
];

for (const f of DIAGNOSIS_FILES) parseDiagnosisFile(p(f));
console.log(`  ${Object.keys(diagnoses).length} diagnoses`);

// ---------------------------------------------------------------------------
// Step 6c: Parse modded department data
// ---------------------------------------------------------------------------
console.log('Parsing modded department data...');
const MOD_ICON_DIR = path.join(DOCS, 'assets', 'mod-icons');
fs.mkdirSync(MOD_ICON_DIR, { recursive: true });

for (const mod of MODS) {
  // --- Process dependencies first (their entities are stamped with this mod's ID) ---
  const combinedDepAssetMap = {};  // accumulate all dep asset maps for use by mod's own files
  for (const dep of (mod.dependencies || [])) {
    // Load dependency localization
    for (const locFolder of (dep.locFolders || [])) {
      const locDir = path.join(ROOT, dep.folder.replace(/\//g, path.sep), locFolder.replace(/\//g, path.sep));
      if (fs.existsSync(locDir)) {
        for (const f of fs.readdirSync(locDir).filter(f => f.startsWith('ModStringTableEn') && f.endsWith('.xml')).sort()) {
          mergeLocFile(path.join(locDir, f));
        }
      }
    }
    // Build dependency asset map and copy PNGs
    const depAssetMap = dep.assetFile ? parseAssetLists(p(`${dep.folder}/${dep.assetFile}`)) : {};
    Object.assign(combinedDepAssetMap, depAssetMap);
    const depRoot = path.join(ROOT, dep.folder.replace(/\//g, path.sep));
    for (const relPath of Object.values(depAssetMap)) {
      const src = path.join(depRoot, relPath);
      if (fs.existsSync(src)) fs.copyFileSync(src, path.join(MOD_ICON_DIR, path.basename(relPath)));
    }
    // Parse dependency data files — use sharedModId if set, else parent mod's id
    const depModId = dep.sharedModId || mod.id;
    for (const f of (dep.symptomFiles     || [])) parseSymptomFile(p(`${dep.folder}/${f}`), depModId, depAssetMap);
    for (const f of (dep.examinationFiles || [])) parseExamFile(p(`${dep.folder}/${f}`), depModId, depAssetMap);
    for (const f of (dep.treatmentFiles   || [])) parseTreatmentFile(p(`${dep.folder}/${f}`), depModId, depAssetMap);
  }

  // --- Build this mod's own asset map and copy PNGs ---
  // Merge dep asset maps so diagnosis/symptom/etc files can resolve icons from deps
  // (e.g. HEM/PSY/NMC diagnoses reference icons defined in Ocean Base Package).
  // Supports both assetFile (single path) and assetFiles (array of paths).
  const modAssetFiles = mod.assetFile
    ? [p(`${mod.folder}/${mod.assetFile}`)]
    : (mod.assetFiles || []).map(f => p(`${mod.folder}/${f}`));
  const modAssetMap = {};
  for (const af of modAssetFiles) Object.assign(modAssetMap, parseAssetLists(af));
  const assetMap = Object.assign({}, combinedDepAssetMap, modAssetMap);
  const modRoot = path.join(ROOT, mod.folder.replace(/\//g, path.sep));
  for (const relPath of Object.values(modAssetMap)) {
    const src = path.join(modRoot, relPath);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(MOD_ICON_DIR, path.basename(relPath)));
  }

  // --- Parse this mod's own data files ---
  // For mods with isolated English strings (_perModEnStrings), temporarily merge
  // those strings into the global map so entity names resolve correctly, then restore
  // to prevent the strings from contaminating other mods parsed later.
  const _isolatedEn = _perModEnStrings[mod.id];
  const _savedStrings = {};
  if (_isolatedEn) {
    for (const [k, v] of Object.entries(_isolatedEn)) {
      _savedStrings[k] = strings[k];
      strings[k] = v;
    }
  }

  const base = mod.folder;
  for (const f of (mod.symptomFiles     || [])) parseSymptomFile(p(`${base}/${f}`), mod.id, assetMap);
  for (const f of (mod.examinationFiles || [])) parseExamFile(p(`${base}/${f}`), mod.id, assetMap);
  for (const f of (mod.treatmentFiles   || [])) parseTreatmentFile(p(`${base}/${f}`), mod.id, assetMap);
  for (const f of (mod.diagnosisFiles   || [])) parseDiagnosisFile(p(`${base}/${f}`), mod.id, assetMap, _modNativeStrings[mod.id] || null);

  if (_isolatedEn) {
    for (const [k, v] of Object.entries(_savedStrings)) {
      if (v === undefined) delete strings[k];
      else strings[k] = v;
    }
  }

  console.log(`  "${mod.id}": loaded`);
}
console.log(`  ${Object.keys(diagnoses).length} total diagnoses, ${Object.keys(symptoms).length} total symptoms`);

// ---------------------------------------------------------------------------
// Step 6a-patch: Apply fallback modIcons for HAIO diagnoses whose iconIndex
// references a cell that is empty in the base-game sprite sheet and for which
// the mod author did not supply a CustomIconSmallAssetRef. Uses the closest
// thematically matching icon from HAIO's own asset library.
// ---------------------------------------------------------------------------
const HAIO_ICON_FALLBACKS = {
  // Dental — oral / gum conditions
  DIA_DEN_GLOSSITIS:              'dia_gums_disease_b.png',
  DIA_DEN_APHTHOUS_ULCER:         'dia_gums_disease_b.png',
  DIA_DEN_SJOGRENS_SYNDROME:      'dia_gums_disease_b.png',
  // Dental — jaw / TMJ / nerve pain
  DIA_DEN_TRIGEMINAL_NEURALGIA:   'dia_jaw_dislocation_b.png',
  DIA_DEN_MYOFASCIAL_PAIN_SYNDROME:'dia_jaw_dislocation_b.png',
  // Dental — jaw deformity / tongue
  DIA_DEN_MACROGLOSSIA:           'dia_malocclusion_b.png',
  DIA_DEN_ANKYLOGLOSSIA:          'dia_malocclusion_b.png',
  DIA_DEN_HEMIFACIAL_ATROPHY:     'dia_malocclusion_b.png',
  // Dental — oral / neck cysts
  DIA_DEN_MUCOCELE:               'dia_tooth_cyst_b.png',
  DIA_DEN_RANULA:                 'dia_jaw_cyst_b.png',
  DIA_DEN_MEDIAN_MANDIBULAR_CYST: 'dia_jaw_cyst_b.png',
  DIA_DEN_DERMOID_CYST:           'dia_jaw_cyst_b.png',
  DIA_DEN_EPIDERMOID_CYST:        'dia_jaw_cyst_b.png',
  DIA_DEN_BRANCHIAL_CLEFT_CYST:   'dia_jaw_cyst_b.png',
  DIA_DEN_THYROGLOSSAL_DUCT_CYST: 'dia_jaw_cyst_b.png',
};
for (const [id, icon] of Object.entries(HAIO_ICON_FALLBACKS)) {
  if (diagnoses[id] && !diagnoses[id].modIcon) diagnoses[id].modIcon = icon;
}
const patchCount = Object.keys(HAIO_ICON_FALLBACKS).length;
console.log(`  Applied ${patchCount} HAIO icon fallbacks`);

// ---------------------------------------------------------------------------
// Step 6b: Create stub entries for symptoms referenced in diagnoses but missing
// XML definitions. These are generic patient complaints (Fever, Nausea, etc.)
// that the game handles without full GameDBSymptom records.
// ---------------------------------------------------------------------------
console.log('Creating stubs for unreferenced symptoms...');
let stubCount = 0;
for (const diag of Object.values(diagnoses)) {
  for (const sr of diag.symptoms) {
    const id = sr.symptomRef;
    if (symptoms[id] || REMOVED_SYMPTOMS.has(id)) continue;
    const descLocId = id + '_DESCRIPTION';
    symptoms[id] = {
      id,
      name: strings[id] || id,
      description: strings[descLocId] || '',
      discomfortLevel: 'Low',
      hazard: 'Low',
      patientComplains: true,
      isMainSymptom: false,
      iconIndex: 0,
      examinations: [],
      treatments: [],
      isStub: true,
    };
    _symLocIds[id] = { locId: id, isStub: true };
    stubCount++;
  }
}
console.log(`  ${stubCount} stub symptoms created`);

// ---------------------------------------------------------------------------
// Step 7: Build reverse indexes
// ---------------------------------------------------------------------------
console.log('Building reverse indexes...');

// exam → symptoms it reveals
const examToSymptoms = {};
for (const sym of Object.values(symptoms)) {
  for (const examId of sym.examinations) {
    if (!examToSymptoms[examId]) examToSymptoms[examId] = [];
    if (!examToSymptoms[examId].includes(sym.id)) {
      examToSymptoms[examId].push(sym.id);
    }
  }
}
console.log(`  ${Object.keys(examToSymptoms).length} exams have symptom mappings`);

// treatment → symptoms it treats
const treatmentToSymptoms = {};
for (const sym of Object.values(symptoms)) {
  for (const trtId of sym.treatments) {
    if (!treatmentToSymptoms[trtId]) treatmentToSymptoms[trtId] = [];
    if (!treatmentToSymptoms[trtId].includes(sym.id)) {
      treatmentToSymptoms[trtId].push(sym.id);
    }
  }
}
console.log(`  ${Object.keys(treatmentToSymptoms).length} treatments have symptom mappings`);

// lab test exam → parent exam that spawns it
const labTestOf = {};
for (const ex of Object.values(examinations)) {
  if (ex.labTestingExaminationRef) {
    labTestOf[ex.labTestingExaminationRef] = ex.id;
  }
}
console.log(`  ${Object.keys(labTestOf).length} lab test exams mapped to parents`);

// Remap examToSymptoms and symptom.examinations to use physical exam IDs
// instead of lab test IDs, so recommendations show the exam the player orders.
for (const [labTestId, parentExamId] of Object.entries(labTestOf)) {
  if (!examToSymptoms[labTestId]) continue;
  if (!examToSymptoms[parentExamId]) examToSymptoms[parentExamId] = [];
  for (const sid of examToSymptoms[labTestId]) {
    if (!examToSymptoms[parentExamId].includes(sid)) examToSymptoms[parentExamId].push(sid);
  }
  delete examToSymptoms[labTestId];
}
for (const sym of Object.values(symptoms)) {
  sym.examinations = [...new Set(sym.examinations.map(eid => labTestOf[eid] ?? eid))];
}

// ---------------------------------------------------------------------------
// Departments (hardcoded - no dedicated XML source)
// ---------------------------------------------------------------------------
function enDeptName(id, fallback) {
  if (DEPT_NAME_OVERRIDES.en?.[id]) return DEPT_NAME_OVERRIDES.en[id];
  return toTitleCase(stripDeptWord(strings[id] || fallback, 'en'));
}

const departments = {
  DPT_EMERGENCY:                      { id: 'DPT_EMERGENCY',                      name: enDeptName('DPT_EMERGENCY',                      'Emergency'),           abbreviation: 'ER',  isDLC: false, order: 1, colorKey: 'emergency',            color: DEPT_COLORS['DPT_EMERGENCY'] },
  DPT_GENERAL_SURGERY_DEPARTMENT:     { id: 'DPT_GENERAL_SURGERY_DEPARTMENT',     name: enDeptName('DPT_GENERAL_SURGERY_DEPARTMENT',     'General Surgery'),     abbreviation: 'GS',  isDLC: false, order: 2, colorKey: 'general-surgery',      color: DEPT_COLORS['DPT_GENERAL_SURGERY_DEPARTMENT'] },
  DPT_INTERNAL_MEDICINE_DEPARTMENT:   { id: 'DPT_INTERNAL_MEDICINE_DEPARTMENT',   name: enDeptName('DPT_INTERNAL_MEDICINE_DEPARTMENT',   'Internal Medicine'),   abbreviation: 'INT', isDLC: false, order: 3, colorKey: 'internal-medicine',    color: DEPT_COLORS['DPT_INTERNAL_MEDICINE_DEPARTMENT'] },
  DPT_ORTHOPAEDICS_AND_TRAUMATOLOGY:  { id: 'DPT_ORTHOPAEDICS_AND_TRAUMATOLOGY',  name: enDeptName('DPT_ORTHOPAEDICS_AND_TRAUMATOLOGY',  'Orthopedics'),         abbreviation: 'ORT', isDLC: false, order: 4, colorKey: 'orthopedics',          color: DEPT_COLORS['DPT_ORTHOPAEDICS_AND_TRAUMATOLOGY'] },
  DPT_CARDIOLOGY:                     { id: 'DPT_CARDIOLOGY',                     name: enDeptName('DPT_CARDIOLOGY',                     'Cardiology'),          abbreviation: 'CAR', isDLC: false, order: 5, colorKey: 'cardiology',           color: DEPT_COLORS['DPT_CARDIOLOGY'] },
  DPT_NEUROLOGY:                      { id: 'DPT_NEUROLOGY',                      name: enDeptName('DPT_NEUROLOGY',                      'Neurology'),           abbreviation: 'NEU', isDLC: false, order: 6, colorKey: 'neurology',            color: DEPT_COLORS['DPT_NEUROLOGY'] },
  DPT_INFECTIOUS_DISEASES_DEPARTMENT: { id: 'DPT_INFECTIOUS_DISEASES_DEPARTMENT', name: enDeptName('DPT_INFECTIOUS_DISEASES_DEPARTMENT', 'Infectious Diseases'), abbreviation: 'INF', isDLC: true,  order: 7, colorKey: 'infectious-diseases', color: DEPT_COLORS['DPT_INFECTIOUS_DISEASES_DEPARTMENT'] },
  DPT_TRAUMATOLOGY_DEPARTMENT:        { id: 'DPT_TRAUMATOLOGY_DEPARTMENT',        name: enDeptName('DPT_TRAUMATOLOGY_DEPARTMENT',        'Traumatology'),        abbreviation: 'TRA', isDLC: true,  order: 8, colorKey: 'traumatology',         color: DEPT_COLORS['DPT_TRAUMATOLOGY_DEPARTMENT'] },
};

// Add modded departments
for (const mod of MODS) {
  for (const deptDef of (mod.departments || [])) {
    if (departments[deptDef.id]) {
      // Already defined by another mod — record co-ownership so the department
      // is visible when either owning mod is enabled (they are mutually exclusive).
      const existing = departments[deptDef.id];
      if (!existing.modIds) existing.modIds = [existing.modId];
      if (!existing.modIds.includes(mod.id)) existing.modIds.push(mod.id);
    } else {
      const fallback = deptDef.id.replace(/^DPT_/, '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
      departments[deptDef.id] = {
        id:           deptDef.id,
        name:         enDeptName(deptDef.id, fallback),
        abbreviation: deptDef.abbreviation,
        isDLC:        false,
        isMod:        true,
        modId:        mod.id,
        order:        deptDef.order,
        colorKey:     deptDef.colorKey,
        color:        DEPT_COLORS[deptDef.id] || null,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Step 7b: Create stub entries for treatments referenced in diagnoses but
// missing XML definitions (mainly surgeries).
// ---------------------------------------------------------------------------
let trtStubCount = 0;
for (const diag of Object.values(diagnoses)) {
  for (const tid of diag.treatments) {
    if (treatments[tid]) continue;
    const descLocId = tid + '_DESCRIPTION';
    treatments[tid] = {
      id: tid,
      name: strings[tid] || tid.replace(/^TRT_/, '').replace(/_/g, ' ').toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase()),
      description: strings[descLocId] || '',
      treatmentType: tid.includes('SURGERY') ? 'SURGERY' : 'PROCEDURE',
      cost: 0,
      iconIndex: 0,
      isStub: true,
    };
    _trtLocIds[tid] = { abbrevLocId: tid, isStub: true };
    trtStubCount++;
  }
}
if (trtStubCount) console.log(`  ${trtStubCount} stub treatments created`);

// ---------------------------------------------------------------------------
// Step 7c: Compute usedByMods for shared-dep entities (CRP, Ocean Base Package)
//
// Shared-dep entities are only shown when a top-level mod that actually uses
// them is enabled. This prevents e.g. CRP symptoms from Oncology leaking into
// the view when only Dept of Diagnostics is active.
// ---------------------------------------------------------------------------
console.log('Computing shared dependency usage...');

const sharedModIds = new Set();
for (const mod of MODS) {
  for (const dep of (mod.dependencies || [])) {
    if (dep.sharedModId) sharedModIds.add(dep.sharedModId);
  }
}

// Tag every shared-dep entity with an empty usedByMods array to start
for (const sym of Object.values(symptoms))    { if (sharedModIds.has(sym.modId)) sym.usedByMods = []; }
for (const ex  of Object.values(examinations)){ if (sharedModIds.has(ex.modId))  ex.usedByMods  = []; }
for (const trt of Object.values(treatments))  { if (sharedModIds.has(trt.modId)) trt.usedByMods = []; }

function markSharedUsed(id, topModId, dict) {
  const entity = dict[id];
  if (!entity?.usedByMods) return;
  if (entity.usedByMods.includes(topModId)) return;
  entity.usedByMods.push(topModId);
  // Propagate symptom → its own exams/treatments
  if (dict === symptoms) {
    for (const eid of (entity.examinations || [])) markSharedUsed(eid, topModId, examinations);
    for (const tid of (entity.treatments   || [])) markSharedUsed(tid, topModId, treatments);
  }
}

for (const diag of Object.values(diagnoses)) {
  const diagModIds = diag.modIds
    ? diag.modIds.filter(m => !sharedModIds.has(m))
    : (!diag.modId || sharedModIds.has(diag.modId) ? [] : [diag.modId]);
  for (const top of diagModIds) {
    for (const sr  of diag.symptoms)    markSharedUsed(sr.symptomRef, top, symptoms);
    for (const eid of diag.examinations) markSharedUsed(eid, top, examinations);
    for (const tid of diag.treatments)   markSharedUsed(tid, top, treatments);
  }
}

const usedSyms = Object.values(symptoms).filter(s => s.usedByMods !== undefined);
const usedExs  = Object.values(examinations).filter(e => e.usedByMods !== undefined);
const usedTrts = Object.values(treatments).filter(t => t.usedByMods !== undefined);
console.log(`  ${usedSyms.length} shared symptoms, ${usedExs.length} shared exams, ${usedTrts.length} shared treatments tagged`);

// ---------------------------------------------------------------------------
// Step 8: Write output
// ---------------------------------------------------------------------------
const BASE_GAME_DATA_FILES = [
  'Game Data/BaseGame/Symptoms.xml',
  'Game Data/BaseGame/Symptoms_main.xml',
  'Game Data/BaseGame/SymptomsDLCShared.xml',
  'Game Data/BaseGame/Examinations.xml',
  'Game Data/BaseGame/ExaminationsReception.xml',
  'Game Data/BaseGame/Treatments.xml',
  'Game Data/BaseGame/Surgery.xml',
  'Game Data/BaseGame/TreatmentsHospitalization.xml',
  'Game Data/BaseGame/DiagnosesER.xml',
  'Game Data/BaseGame/DiagnosesINTERN.xml',
  'Game Data/BaseGame/DiagnosesCARDIO.xml',
  'Game Data/BaseGame/DiagnosesNEURO.xml',
  'Game Data/BaseGame/DiagnosesORTHO.xml',
  'Game Data/BaseGame/DiagnosesSURG.xml',
  'Game Data/BaseGame/DiagnosisOccurrences.xml',
];
const DLC_ID_DATA_FILES = [
  'Game Data/DLCInfectiousDiseases/DLCSymptomsMain.xml',
  'Game Data/DLCInfectiousDiseases/DLCSymptoms.xml',
  'Game Data/DLCInfectiousDiseases/DLCExaminations.xml',
  'Game Data/DLCInfectiousDiseases/DLCTreatments.xml',
  'Game Data/DLCInfectiousDiseases/DiagnosesINFECT.xml',
];
const DLC_TRA_DATA_FILES = [
  'Game Data/DLCTraumatology/DLCSymptomsMain.xml',
  'Game Data/DLCTraumatology/DLCSymptoms.xml',
  'Game Data/DLCTraumatology/DLCExaminations.xml',
  'Game Data/DLCTraumatology/DLCTreatments.xml',
  'Game Data/DLCTraumatology/DLCSurgery.xml',
  'Game Data/DLCTraumatology/DiagnosesTRAUMA.xml',
];

// ---------------------------------------------------------------------------
// Step 9: Generate split locale files (base + per-mod) for all non-English languages
// ---------------------------------------------------------------------------
const LOCALE_DIR = path.join(DOCS, 'data', 'locale');
// Always wipe and recreate locale/mods/ so stale per-mod files from previous builds
// don't survive when a mod loses a language or its locale is otherwise removed.
const localeModsDir = path.join(LOCALE_DIR, 'mods');
if (fs.existsSync(localeModsDir)) fs.rmSync(localeModsDir, { recursive: true, force: true });
fs.mkdirSync(path.join(LOCALE_DIR, 'base'), { recursive: true });

// Language code → { folder in BaseGame/Localization, XML prefix, folder in DLC/Localization }
// dlcFolder: null means no DLC translations exist for this language
const LOCALE_CONFIGS = [
  { lang: 'cz',    folder: 'cz',    prefix: 'Cz',     dlcFolder: 'cz'    },
  { lang: 'da',    folder: 'da',    prefix: 'Da',     dlcFolder: null    },
  { lang: 'de',    folder: 'de',    prefix: 'De',     dlcFolder: 'de'    },
  { lang: 'es',    folder: 'es',    prefix: 'Es',     dlcFolder: 'es'    },
  { lang: 'es-la', folder: 'es-la', prefix: 'La',     dlcFolder: 'la'    },
  { lang: 'fr',    folder: 'fr',    prefix: 'Fr',     dlcFolder: 'fr'    },
  { lang: 'hu',    folder: 'hu',    prefix: 'Hu',     dlcFolder: 'hu'    },
  { lang: 'it',    folder: 'it',    prefix: 'It',     dlcFolder: 'it'    },
  { lang: 'jp',    folder: 'jp',    prefix: 'Ja',     dlcFolder: 'jp'    },
  { lang: 'kr',    folder: 'kr',    prefix: 'Kr',     dlcFolder: 'kr'    },
  { lang: 'nl',    folder: 'nl',    prefix: 'Nl',     dlcFolder: 'nl'    },
  { lang: 'pl',    folder: 'pl',    prefix: 'Pl',     dlcFolder: 'pl'    },
  { lang: 'pt-br', folder: 'pt-br', prefix: 'PtBr',   prefixAliases: ['PTbr', 'PTBr'],  dlcFolder: 'pt-br' },
  { lang: 'ru',    folder: 'ru',    prefix: 'Ru',                                       dlcFolder: 'ru'    },
  { lang: 'swe',   folder: 'swe',   prefix: 'Swe',                                      dlcFolder: 'swe'   },
  { lang: 'tr',    folder: 'tr',    prefix: 'Tr',                                        dlcFolder: 'tr'    },
  { lang: 'uk',    folder: 'uk',    prefix: 'Uk',                                        dlcFolder: 'uk'    },
  { lang: 'zh-cn', folder: 'zh-cn', prefix: 'ZhHans', prefixAliases: ['ZhHan'],          dlcFolder: 'zh-cn' },
  { lang: 'zh-tw', folder: 'zh-tw', prefix: 'ZhTw',   prefixAliases: ['Zhtw', 'zhtw'],  dlcFolder: 'zh-tw' },
];

const modLangSupport = {}; // modId -> Set of languages with ≥1 translated entity

console.log('\nGenerating locale overlays...');
for (const cfg of LOCALE_CONFIGS) {
  const { baseOverlay, modOverlays, localizedModIds } = buildLocaleOverlay(cfg);

  for (const modId of localizedModIds) {
    if (!modLangSupport[modId]) modLangSupport[modId] = new Set();
    modLangSupport[modId].add(cfg.lang);
  }

  // Write base locale
  const basePath = path.join(LOCALE_DIR, 'base', `${cfg.lang}.json`);
  fs.writeFileSync(basePath, JSON.stringify(baseOverlay));
  const baseTotal = ['diagnoses', 'symptoms', 'examinations', 'treatments', 'departments'].reduce(
    (s, k) => s + Object.keys(baseOverlay[k] || {}).length, 0
  ) + Object.values(baseOverlay.ui || {}).reduce((s, o) => s + Object.keys(o).length, 0);
  const baseKb = (fs.statSync(basePath).size / 1024).toFixed(0);
  console.log(`  ${cfg.lang.padEnd(6)}: ${String(baseTotal).padStart(4)} base entries (${baseKb} KB)`);

  // Apply editorial department name patches before writing
  const langDeptPatches = LOCALE_DEPT_NAME_PATCHES[cfg.lang];
  if (langDeptPatches) {
    for (const modLocale of Object.values(modOverlays)) {
      if (!modLocale.departments) continue;
      for (const [deptId, newName] of Object.entries(langDeptPatches)) {
        if (modLocale.departments[deptId]) modLocale.departments[deptId].name = newName;
      }
    }
  }

  // Write per-mod locales
  for (const [modId, modLocale] of Object.entries(modOverlays)) {
    const hasContent = ['diagnoses', 'symptoms', 'examinations', 'treatments', 'departments']
      .some(k => Object.keys(modLocale[k] || {}).length > 0);
    if (!hasContent) continue;
    fs.mkdirSync(path.join(LOCALE_DIR, 'mods', modId), { recursive: true });
    fs.writeFileSync(path.join(LOCALE_DIR, 'mods', modId, `${cfg.lang}.json`), JSON.stringify(modLocale));
  }
}

// Mods with a declared nativeLang use that language as their entity-name baseline.
for (const mod of MODS) {
  if (!mod.nativeLang || sharedModIds.has(mod.id)) continue;
  if (!modLangSupport[mod.id]) modLangSupport[mod.id] = new Set();
  modLangSupport[mod.id].add(mod.nativeLang);
}

// English support tracked via _realEnDiagIds (humanized IDs excluded).
for (const mod of MODS) {
  if (sharedModIds.has(mod.id)) continue;
  const modDiags = Object.values(diagnoses).filter(e => e.modId === mod.id && !e.baseGameId);
  const hasEnglish = modDiags.some(e => _realEnDiagIds.has(e.id));
  if (hasEnglish) {
    if (!modLangSupport[mod.id]) modLangSupport[mod.id] = new Set();
    modLangSupport[mod.id].add('en');
  }
}

// Build modsOutput for manifest (user-facing mods only, no shared deps).
const modsOutput = {};
for (const mod of MODS) {
  if (sharedModIds.has(mod.id)) continue;
  const modDataFiles = [
    ...(mod.occurrenceFile ? [`${mod.folder}/${mod.occurrenceFile}`] : []),
    ...(mod.diagnosisFiles || []).map(f => `${mod.folder}/${f}`),
  ];
  modsOutput[mod.id] = {
    id:                 mod.id,
    name:               mod.name,
    author:             mod.author,
    departments:        (mod.departments || []).map(d => d.id),
    lastUpdated:        maxMtime(modDataFiles),
    localizedLanguages: mod.localizedLanguages
      ? [...mod.localizedLanguages].sort()
      : [...(modLangSupport[mod.id] || [])].sort(),
    ...(mod.steamUrl ? { steamUrl: mod.steamUrl } : {}),
  };
}

// Compute symmetric conflict lists and stamp onto manifest entries.
// Sources: (1) shared department IDs between mods, (2) explicit conflictsWith declarations.
for (const mod of MODS) {
  if (sharedModIds.has(mod.id) || !modsOutput[mod.id]) continue;
  const depts = new Set((mod.departments || []).map(d => d.id));
  const conflicts = new Set(mod.conflictsWith || []);
  for (const other of MODS) {
    if (other.id === mod.id || sharedModIds.has(other.id)) continue;
    // Department overlap
    if (depts.size && (other.departments || []).some(d => depts.has(d.id))) {
      conflicts.add(other.id);
    }
    // Reverse explicit declaration (other lists us in its conflictsWith)
    if ((other.conflictsWith || []).includes(mod.id)) {
      conflicts.add(other.id);
    }
  }
  if (conflicts.size) modsOutput[mod.id].conflictsWith = [...conflicts].sort();
}

// ---------------------------------------------------------------------------
// Step 8: Write split output files
// ---------------------------------------------------------------------------

// Copy icons.png
const iconsSrc = path.join(ROOT, 'icons.png');
const iconsDst = path.join(DOCS, 'assets', 'icons.png');
if (fs.existsSync(iconsSrc)) {
  fs.copyFileSync(iconsSrc, iconsDst);
  console.log(`Copied icons.png to docs/assets/`);
} else {
  console.warn('icons.png not found at root!');
}

// --- Helpers for entity attribution ---

function isBaseGameEntity(entity) {
  return !entity.modId && !entity.modIds;
}

// Returns true if this entity should be included in the given mod's data file.
function entityBelongsToMod(entity, modId) {
  if (entity.modId === modId) return true;
  if (entity.modIds?.includes(modId)) return true;
  // Shared-dep entity actually referenced by this mod's diagnoses
  if (sharedModIds.has(entity.modId) && entity.usedByMods?.includes(modId)) return true;
  return false;
}

// --- base.json ---
const baseDepts = {};
for (const [id, d] of Object.entries(departments)) {
  if (!d.isMod) baseDepts[id] = d;
}
const baseDiags = {};
for (const [id, e] of Object.entries(diagnoses)) {
  if (!e.modId && !e.baseGameId) baseDiags[id] = e;
}
const baseSyms  = {}, baseExams = {}, baseTrts = {};
for (const [id, e] of Object.entries(symptoms))     { if (isBaseGameEntity(e)) baseSyms[id]  = e; }
for (const [id, e] of Object.entries(examinations)) { if (isBaseGameEntity(e)) baseExams[id] = e; }
for (const [id, e] of Object.entries(treatments))   { if (isBaseGameEntity(e)) baseTrts[id]  = e; }

const baseExamToSyms = {}, baseTrtToSyms = {};
for (const sym of Object.values(baseSyms)) {
  for (const eid of sym.examinations || []) {
    if (!baseExamToSyms[eid]) baseExamToSyms[eid] = [];
    if (!baseExamToSyms[eid].includes(sym.id)) baseExamToSyms[eid].push(sym.id);
  }
  for (const tid of sym.treatments || []) {
    if (!baseTrtToSyms[tid]) baseTrtToSyms[tid] = [];
    if (!baseTrtToSyms[tid].includes(sym.id)) baseTrtToSyms[tid].push(sym.id);
  }
}

const baseOutput = {
  version: '2.0',
  buildDate: new Date().toISOString(),
  dataUpdated: {
    baseGame:              maxMtime(BASE_GAME_DATA_FILES),
    dlcInfectiousDiseases: maxMtime(DLC_ID_DATA_FILES),
    dlcTraumatology:       maxMtime(DLC_TRA_DATA_FILES),
  },
  departments:          baseDepts,
  occurrences,
  diagnoses:            baseDiags,
  symptoms:             baseSyms,
  examinations:         baseExams,
  treatments:           baseTrts,
  examToSymptoms:       baseExamToSyms,
  treatmentToSymptoms:  baseTrtToSyms,
  labTestOf,
  ui: buildUiSection(strings),
};

fs.mkdirSync(path.join(DOCS, 'data'), { recursive: true });
const baseJsonPath = path.join(DOCS, 'data', 'base.json');
fs.writeFileSync(baseJsonPath, JSON.stringify(baseOutput));
console.log(`\nWrote base.json (${(fs.statSync(baseJsonPath).size / 1024).toFixed(0)} KB)`);

// --- mods/manifest.json ---
fs.mkdirSync(path.join(DOCS, 'data', 'mods'), { recursive: true });
const manifestPath = path.join(DOCS, 'data', 'mods', 'manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(modsOutput));
console.log(`Wrote mods/manifest.json`);

// --- mods/{id}.json ---
for (const mod of MODS) {
  if (sharedModIds.has(mod.id)) continue;

  // Departments this mod contributes
  const modDepts = {};
  for (const deptDef of (mod.departments || [])) {
    const dept = departments[deptDef.id];
    if (dept) {
      modDepts[deptDef.id] = {
        ...dept,
        modId: mod.id,
        ...(deptDef.nameOverride ? { name: deptDef.nameOverride } : {}),
      };
    }
  }

  const modDiags = {}, modSyms = {}, modExams = {}, modTrts = {};
  const overrideReplace = {};

  for (const [id, e] of Object.entries(diagnoses)) {
    if (!entityBelongsToMod(e, mod.id)) continue;
    if (sharedModIds.has(e.modId)) {
      // Shared-dep entity: inline with this mod's id stamped
      modDiags[id] = { ...e, modId: mod.id };
    } else if (e.baseGameId) {
      // Override of a base-game diagnosis → overrides.replace (original ID as key)
      const entry = { ...e };
      delete entry.id;
      delete entry.baseGameId;
      overrideReplace[e.baseGameId] = entry;
    } else if (id.includes('__')) {
      // Parallel version of another mod's diagnosis (same dept, conflicting mods)
      // Store under the canonical ID in this mod's file
      const baseId = id.split('__')[0];
      modDiags[baseId] = { ...e, id: baseId };
    } else {
      modDiags[id] = e;
    }
  }
  for (const [id, e] of Object.entries(symptoms)) {
    if (!entityBelongsToMod(e, mod.id)) continue;
    modSyms[id] = sharedModIds.has(e.modId) ? { ...e, modId: mod.id } : e;
  }
  for (const [id, e] of Object.entries(examinations)) {
    if (!entityBelongsToMod(e, mod.id)) continue;
    modExams[id] = sharedModIds.has(e.modId) ? { ...e, modId: mod.id } : e;
  }
  for (const [id, e] of Object.entries(treatments)) {
    if (!entityBelongsToMod(e, mod.id)) continue;
    modTrts[id] = sharedModIds.has(e.modId) ? { ...e, modId: mod.id } : e;
  }

  const modData = {
    departments:  modDepts,
    diagnoses:    modDiags,
    symptoms:     modSyms,
    examinations: modExams,
    treatments:   modTrts,
    ...(Object.keys(overrideReplace).length
      ? { overrides: { replace: { diagnoses: overrideReplace } } }
      : {}),
  };

  const modJsonPath = path.join(DOCS, 'data', 'mods', `${mod.id}.json`);
  fs.writeFileSync(modJsonPath, JSON.stringify(modData));
  console.log(`  mods/${mod.id}.json (${(fs.statSync(modJsonPath).size / 1024).toFixed(0)} KB)`);
}

console.log('\nBuild complete.');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function maxMtime(relPaths) {
  let maxMs = 0;
  for (const rp of relPaths) {
    const abs = p(rp);
    if (fs.existsSync(abs)) {
      const mt = fs.statSync(abs).mtimeMs;
      if (mt > maxMs) maxMs = mt;
    }
  }
  return maxMs > 0 ? new Date(maxMs).toISOString() : null;
}

function toArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(v => String(v)).filter(Boolean);
  return [String(val)].filter(Boolean);
}

function buildLocaleOverlay({ lang, folder, prefix, prefixAliases = [], dlcFolder }) {
  const allPrefixes = [prefix, ...prefixAliases];

  // Load an XML locale file into a target string map.
  function mlInto(absPath, target) {
    const parsed = parseXml(absPath);
    if (!parsed?.Database) return;
    for (const table of [].concat(parsed.Database.GameDBStringTable || [])) {
      for (const e of (table?.LocalizedStrings?.GameDBLocalizedString || [])) {
        if (e.LocID && e.Text !== undefined) target[e.LocID] = String(e.Text);
      }
    }
  }

  // Scan a directory for ModStringTable{prefix}*.xml files and load them into target.
  function mlDirInto(absDir, target) {
    if (!fs.existsSync(absDir)) return;
    for (const f of fs.readdirSync(absDir)
      .filter(fn => fn.endsWith('.xml') && allPrefixes.some(pfx => fn.startsWith(`ModStringTable${pfx}`)))
      .sort()) {
      mlInto(path.join(absDir, f), target);
    }
  }

  // ── Step A: Base game + DLC locale ────────────────────────────────────────
  const baseLs = {};
  function mlBase(relPath) { mlInto(p(relPath), baseLs); }

  const bgDir = `Game Data/BaseGame/Localization/${folder}`;
  mlBase(`${bgDir}/StringTable${prefix}Diagnoses.xml`);
  mlBase(`${bgDir}/StringTable${prefix}Examinations.xml`);
  mlBase(`${bgDir}/StringTable${prefix}Symptoms.xml`);
  mlBase(`${bgDir}/StringTable${prefix}SymptomsDLCShared.xml`);
  mlBase(`${bgDir}/StringTable${prefix}Treatments.xml`);
  mlBase(`${bgDir}/StringTable${prefix}BuildingMode.xml`);
  mlBase(`${bgDir}/StringTable${prefix}Skills.xml`);
  mlBase(`${bgDir}/StringTable${prefix}Characters.xml`);
  const bgDirAbs = path.join(ROOT, 'Game Data', 'BaseGame', 'Localization', folder);
  if (fs.existsSync(bgDirAbs)) {
    for (const f of fs.readdirSync(bgDirAbs).sort()) {
      if (f.toLowerCase().includes('patch')) mlBase(`${bgDir}/${f}`);
    }
  }
  if (dlcFolder) {
    mlBase(`Game Data/DLCInfectiousDiseases/Localization/${dlcFolder}/StringTable${prefix}DLCInfectiousDiseases.xml`);
    mlBase(`Game Data/DLCTraumatology/Localization/${dlcFolder}/StringTable${prefix}DLCTraumatology.xml`);
    mlBase(`Game Data/DLCTraumatology/Localization/${dlcFolder}/StringTable${prefix}DLCTraumatologyWheelchairs.xml`);
  }

  // ── Step B: Per-mod isolated string maps ──────────────────────────────────
  // Each mod gets: baseLs + its shared-dep locale + its own locale files.
  // No other top-level mod's strings are included, preventing cross-contamination.
  const modLsMap = {}; // modId -> string map

  for (const mod of MODS) {
    if (sharedModIds.has(mod.id)) continue;

    const ls = { ...baseLs };

    // Shared dep locale (files that live in the shared dep's folder, dep.locFolders)
    for (const dep of (mod.dependencies || [])) {
      for (const lf of (dep.locFolders || [])) {
        mlDirInto(path.join(ROOT, dep.folder.replace(/\//g, path.sep), lf.replace(/\//g, path.sep)), ls);
      }
    }

    // This mod's own locale files (locFolders, locFoldersOverlayOnly)
    for (const lf of [...(mod.locFolders || []), ...(mod.locFoldersOverlayOnly || [])]) {
      mlDirInto(path.join(ROOT, mod.folder.replace(/\//g, path.sep), lf.replace(/\//g, path.sep)), ls);
    }

    // locFolderByLangPrefix (HAIO-style: Database/ModLocalisation/{LangPrefix}/)
    if (mod.locFolderByLangPrefix) {
      for (const pfx of allPrefixes) {
        const langDir = path.join(ROOT, mod.folder.replace(/\//g, path.sep),
          mod.locFolderByLangPrefix.replace(/\//g, path.sep), pfx);
        for (const absPath of scanXmlRecursive(langDir)) {
          if (allPrefixes.some(ap => path.basename(absPath).startsWith(`ModStringTable${ap}`))) {
            mlInto(absPath, ls);
          }
        }
      }
    }

    modLsMap[mod.id] = ls;
  }

  // ── Step C: Build locale entries using per-context string maps ─────────────
  const baseOverlay = { diagnoses: {}, symptoms: {}, examinations: {}, treatments: {}, departments: {}, ui: {} };
  const modOverlays = {};
  function getModOverlay(modId) {
    if (!modOverlays[modId]) modOverlays[modId] = { diagnoses: {}, symptoms: {}, examinations: {}, treatments: {}, departments: {} };
    return modOverlays[modId];
  }

  // Build a locale entry using the given string map.
  function buildEntry(en, locId, ls) {
    const k    = locId ? locId.replace(/_DESC(?:RIPTION)?.*$/i, '') : null;
    const name = k && ls[k] !== undefined ? toTitleCase(ls[k]) : null;
    const desc = locId && ls[locId] !== undefined ? String(ls[locId]) : null;
    const entry = {};
    if (name !== null && name !== en.name) entry.name = name;
    if (desc !== null && desc !== '' && desc !== en.description) entry.description = desc;
    return Object.keys(entry).length ? entry : null;
  }

  function buildExamEntry(en, abbrevLocId, ls) {
    const nameFromId  = ls[en.id] !== undefined ? toTitleCase(ls[en.id]) : null;
    const k           = abbrevLocId ? abbrevLocId.replace(/_DESC(?:RIPTION)?.*$/i, '') : null;
    const nameFromLoc = k && ls[k] !== undefined ? toTitleCase(ls[k]) : null;
    const name        = nameFromId || nameFromLoc;
    const desc        = abbrevLocId && ls[abbrevLocId] !== undefined ? String(ls[abbrevLocId]) : null;
    const entry = {};
    if (name !== null && name !== en.name) entry.name = name;
    if (desc !== null && desc !== '' && desc !== en.description) entry.description = desc;
    return Object.keys(entry).length ? entry : null;
  }

  function buildStubEntry(en, locId, ls) {
    const name = locId && ls[locId] !== undefined ? toTitleCase(ls[locId]) : null;
    const desc = locId && ls[locId + '_DESCRIPTION'] !== undefined ? String(ls[locId + '_DESCRIPTION']) : null;
    const entry = {};
    if (name !== null && name !== en.name) entry.name = name;
    if (desc !== null && desc !== '' && desc !== en.description) entry.description = desc;
    return Object.keys(entry).length ? entry : null;
  }

  // Determine which string map to use when building entries for a given entity.
  // For shared dep entities we use each consuming mod's own ls (called per-mod below).
  // For base entities we use baseLs.
  // For mod entities we use modLsMap[modId].
  function lsFor(modId) {
    if (!modId) return baseLs;
    return modLsMap[modId] || baseLs;
  }

  // -- Base-game diagnoses --
  for (const [id, locId] of Object.entries(_diagLocIds)) {
    const en = diagnoses[id];
    if (!en || en.modId) continue;
    const entry = buildEntry(en, locId, baseLs);
    if (entry) baseOverlay.diagnoses[id] = entry;
  }

  // -- Base-game symptoms --
  for (const [id, { locId, isStub }] of Object.entries(_symLocIds)) {
    const en = symptoms[id];
    if (!en || en.modId) continue;
    const entry = isStub ? buildStubEntry(en, locId, baseLs) : buildEntry(en, locId, baseLs);
    if (entry) baseOverlay.symptoms[id] = entry;
  }

  // -- Base-game examinations --
  for (const [id, abbrevLocId] of Object.entries(_examLocIds)) {
    const en = examinations[id];
    if (!en || en.modId) continue;
    const entry = buildExamEntry(en, abbrevLocId, baseLs);
    if (entry) baseOverlay.examinations[id] = entry;
  }

  // -- Base-game treatments --
  for (const [id, { abbrevLocId, isStub }] of Object.entries(_trtLocIds)) {
    const en = treatments[id];
    if (!en || en.modId) continue;
    const entry = isStub ? buildStubEntry(en, abbrevLocId, baseLs) : buildEntry(en, abbrevLocId, baseLs);
    if (entry) baseOverlay.treatments[id] = entry;
  }

  // -- Per-mod entities (including shared dep entities inlined into each mod) --
  for (const mod of MODS) {
    if (sharedModIds.has(mod.id)) continue;
    const ls = modLsMap[mod.id];

    // Diagnoses
    for (const [id, locId] of Object.entries(_diagLocIds)) {
      const en = diagnoses[id];
      if (!en) continue;
      const isOwned      = en.modId === mod.id;
      const isCoOwned    = !isOwned && en.modIds?.includes(mod.id);
      const isSharedUsed = !isOwned && !isCoOwned && sharedModIds.has(en.modId) && en.usedByMods?.includes(mod.id);
      if (!isOwned && !isCoOwned && !isSharedUsed) continue;

      const entry = buildEntry(en, locId, ls);
      if (!entry) continue;
      const mo = getModOverlay(mod.id);

      if (isOwned && en.baseGameId) {
        // Override of a base-game diagnosis. Only include if this mod's strings differ from
        // what the base locale already provides — avoids redundant entries and false
        // "language supported" signals for mods whose override uses unmodified base strings.
        const baseEntry = baseOverlay.diagnoses[en.baseGameId];
        const differs = !baseEntry
          || (entry.name        !== undefined && entry.name        !== baseEntry.name)
          || (entry.description !== undefined && entry.description !== baseEntry.description);
        if (differs) mo.diagnoses[en.baseGameId] = entry;
      } else if (isOwned && id.includes('__')) {
        // Parallel version of another mod's entity — store under the canonical ID
        mo.diagnoses[id.split('__')[0]] = entry;
      } else {
        mo.diagnoses[id] = entry;
      }
    }

    // Symptoms
    for (const [id, { locId, isStub }] of Object.entries(_symLocIds)) {
      const en = symptoms[id];
      if (!en) continue;
      const isOwned      = en.modId === mod.id;
      const isCoOwned    = !isOwned && en.modIds?.includes(mod.id);
      const isSharedUsed = !isOwned && !isCoOwned && sharedModIds.has(en.modId) && en.usedByMods?.includes(mod.id);
      if (!isOwned && !isCoOwned && !isSharedUsed) continue;
      const entry = isStub ? buildStubEntry(en, locId, ls) : buildEntry(en, locId, ls);
      if (entry) getModOverlay(mod.id).symptoms[id] = entry;
    }

    // Examinations
    for (const [id, abbrevLocId] of Object.entries(_examLocIds)) {
      const en = examinations[id];
      if (!en) continue;
      const isOwned      = en.modId === mod.id;
      const isCoOwned    = !isOwned && en.modIds?.includes(mod.id);
      const isSharedUsed = !isOwned && !isCoOwned && sharedModIds.has(en.modId) && en.usedByMods?.includes(mod.id);
      if (!isOwned && !isCoOwned && !isSharedUsed) continue;
      const entry = buildExamEntry(en, abbrevLocId, ls);
      if (entry) getModOverlay(mod.id).examinations[id] = entry;
    }

    // Treatments
    for (const [id, { abbrevLocId, isStub }] of Object.entries(_trtLocIds)) {
      const en = treatments[id];
      if (!en) continue;
      const isOwned      = en.modId === mod.id;
      const isCoOwned    = !isOwned && en.modIds?.includes(mod.id);
      const isSharedUsed = !isOwned && !isCoOwned && sharedModIds.has(en.modId) && en.usedByMods?.includes(mod.id);
      if (!isOwned && !isCoOwned && !isSharedUsed) continue;
      const entry = isStub ? buildStubEntry(en, abbrevLocId, ls) : buildEntry(en, abbrevLocId, ls);
      if (entry) getModOverlay(mod.id).treatments[id] = entry;
    }

    // Departments owned by this mod
    for (const deptDef of (mod.departments || [])) {
      const dept = departments[deptDef.id];
      if (!dept) continue;
      const rawName = ls[deptDef.id];
      if (rawName === undefined) continue;
      const langName = stripDeptWord(String(rawName), lang);
      // Compare against this mod's effective English name (nameOverride takes priority)
      const effectiveEnName = deptDef.nameOverride || dept.name;
      if (langName !== effectiveEnName) getModOverlay(mod.id).departments[deptDef.id] = { name: langName };
    }
  }

  // -- Base-game departments --
  for (const [deptId, dept] of Object.entries(departments)) {
    if (dept.isMod) continue;
    const rawName = baseLs[deptId];
    if (rawName === undefined) continue;
    const langName = stripDeptWord(String(rawName), lang);
    if (langName !== dept.name) baseOverlay.departments[deptId] = { name: langName };
  }
  // Hard overrides
  for (const [deptId, name] of Object.entries(DEPT_NAME_OVERRIDES[lang] || {})) {
    const dept = departments[deptId];
    if (!dept?.isMod) {
      baseOverlay.departments[deptId] = { name };
    } else if (dept.modId && !sharedModIds.has(dept.modId)) {
      getModOverlay(dept.modId).departments[deptId] = { name };
    }
  }

  // -- UI strings (always base) --
  const langUi = buildUiSection(baseLs);
  const enUi   = buildUiSection(strings);
  const uiRoomTags = {}, uiHazard = {}, uiMobility = {}, uiDiscomfort = {};
  for (const [tagId] of Object.entries(ROOM_TAG_LOC_IDS)) {
    const langVal = langUi.roomTags[tagId], enVal = enUi.roomTags[tagId];
    if (langVal && langVal !== enVal) uiRoomTags[tagId] = langVal;
  }
  for (const [level, enVal] of Object.entries(enUi.hazard)) {
    const langVal = langUi.hazard[level];
    if (langVal && langVal !== enVal) uiHazard[level] = langVal;
  }
  for (const [key, enVal] of Object.entries(enUi.mobility)) {
    const langVal = langUi.mobility[key];
    if (langVal && langVal !== enVal) uiMobility[key] = langVal;
  }
  for (const [level, enVal] of Object.entries(enUi.discomfort)) {
    const langVal = langUi.discomfort[level];
    if (langVal && langVal !== enVal) uiDiscomfort[level] = langVal;
  }
  if (Object.keys(uiRoomTags).length)   baseOverlay.ui.roomTags   = uiRoomTags;
  if (Object.keys(uiHazard).length)     baseOverlay.ui.hazard     = uiHazard;
  if (Object.keys(uiMobility).length)   baseOverlay.ui.mobility   = uiMobility;
  if (Object.keys(uiDiscomfort).length) baseOverlay.ui.discomfort = uiDiscomfort;
  if (!Object.keys(baseOverlay.departments).length) delete baseOverlay.departments;
  if (!Object.keys(baseOverlay.ui).length)          delete baseOverlay.ui;

  // Track which top-level mods have ≥1 own (non-override) diagnosis translated.
  const topModIds = new Set(MODS.filter(m => !sharedModIds.has(m.id)).map(m => m.id));
  const localizedModIds = new Set();
  for (const modId of Object.keys(modOverlays)) {
    if (!topModIds.has(modId)) continue;
    const hasOwnDiag = Object.keys(modOverlays[modId].diagnoses || {}).some(id => {
      const diag = diagnoses[id] || diagnoses[`${id}__${modId}`];
      return diag && !diag.baseGameId;
    });
    if (hasOwnDiag) localizedModIds.add(modId);
  }

  return { baseOverlay, modOverlays, localizedModIds };
}

function buildUiSection(ls) {
  const roomTags = { ...ROOM_TAG_STATIC };
  for (const [tagId, locId] of Object.entries(ROOM_TAG_LOC_IDS)) {
    roomTags[tagId] = ls[locId] || tagId;
  }
  const isEn = ls === strings;
  const h = (k, fb) => toTitleCase(ls[k] || fb);
  return {
    roomTags,
    // For English, store the full "Low Hazard" phrase so views need no suffix.
    // For other languages, the overlay value is whatever the LocID gives (may be
    // just an adjective like "Gering" or a full phrase like "Risque Faible").
    hazard: {
      Low:    isEn ? h('HAZARD_LOW',    'low')    + ' Hazard' : h('HAZARD_LOW',    'Low'),
      Medium: isEn ? h('HAZARD_MEDIUM', 'medium') + ' Hazard' : h('HAZARD_MEDIUM', 'Medium'),
      High:   isEn ? h('HAZARD_HIGH',   'high')   + ' Hazard' : h('HAZARD_HIGH',   'High'),
    },
    discomfort: {
      Low:    isEn ? h('HAZARD_LOW',    'low')    + ' Discomfort' : h('HAZARD_LOW',    'Low'),
      Medium: isEn ? h('HAZARD_MEDIUM', 'medium') + ' Discomfort' : h('HAZARD_MEDIUM', 'Medium'),
      High:   isEn ? h('HAZARD_HIGH',   'high')   + ' Discomfort' : h('HAZARD_HIGH',   'High'),
    },
    mobility: {
      IMOBILE:   ls['SYMPTOM_IMOBILE']   || 'Immobile',
      INTUBATED: ls['SYMPTOM_INTUBATED'] || 'Intubated',
    },
  };
}
