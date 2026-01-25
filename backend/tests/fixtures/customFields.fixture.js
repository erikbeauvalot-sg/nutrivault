/**
 * Custom Fields Fixtures
 * Test data for custom field-related tests
 */

/**
 * Valid category creation data
 */
const validCategory = {
  name: 'Medical History',
  description: 'Fields related to patient medical history',
  entity_type: 'patient',
  display_order: 1,
  is_active: true
};

/**
 * Multiple categories
 */
const categoriesList = [
  {
    name: 'Medical History',
    description: 'Medical background information',
    entity_type: 'patient',
    display_order: 1,
    is_active: true
  },
  {
    name: 'Lifestyle',
    description: 'Patient lifestyle information',
    entity_type: 'patient',
    display_order: 2,
    is_active: true
  },
  {
    name: 'Dietary Preferences',
    description: 'Food preferences and restrictions',
    entity_type: 'patient',
    display_order: 3,
    is_active: true
  },
  {
    name: 'Visit Notes',
    description: 'Additional visit documentation',
    entity_type: 'visit',
    display_order: 1,
    is_active: true
  }
];

/**
 * Valid field definitions
 */
const fieldDefinitions = {
  textField: {
    field_name: 'blood_type',
    field_label: 'Blood Type',
    field_type: 'text',
    description: 'Patient blood type',
    is_required: false,
    display_order: 1,
    is_active: true,
    validation_rules: {
      maxLength: 10
    }
  },
  selectField: {
    field_name: 'dietary_restriction',
    field_label: 'Dietary Restriction',
    field_type: 'select',
    description: 'Primary dietary restriction',
    is_required: false,
    display_order: 2,
    is_active: true,
    options: ['None', 'Vegetarian', 'Vegan', 'Gluten-free', 'Lactose-free', 'Halal', 'Kosher']
  },
  numberField: {
    field_name: 'daily_water_intake',
    field_label: 'Daily Water Intake (L)',
    field_type: 'number',
    description: 'Average daily water consumption in liters',
    is_required: false,
    display_order: 3,
    is_active: true,
    validation_rules: {
      min: 0,
      max: 10,
      step: 0.1
    }
  },
  booleanField: {
    field_name: 'smoker',
    field_label: 'Smoker',
    field_type: 'boolean',
    description: 'Whether the patient smokes',
    is_required: false,
    display_order: 4,
    is_active: true
  },
  dateField: {
    field_name: 'last_checkup',
    field_label: 'Last Medical Checkup',
    field_type: 'date',
    description: 'Date of last general medical checkup',
    is_required: false,
    display_order: 5,
    is_active: true
  },
  textareaField: {
    field_name: 'medical_notes',
    field_label: 'Medical Notes',
    field_type: 'textarea',
    description: 'Additional medical notes',
    is_required: false,
    display_order: 6,
    is_active: true,
    validation_rules: {
      maxLength: 2000
    }
  },
  multiselectField: {
    field_name: 'allergies',
    field_label: 'Allergies',
    field_type: 'multiselect',
    description: 'Known allergies',
    is_required: false,
    display_order: 7,
    is_active: true,
    options: ['Nuts', 'Dairy', 'Eggs', 'Shellfish', 'Soy', 'Wheat', 'Fish']
  }
};

/**
 * Invalid category data
 */
const invalidCategories = {
  missingName: {
    description: 'Category without name',
    entity_type: 'patient'
  },
  invalidEntityType: {
    name: 'Invalid Category',
    description: 'Category with invalid entity type',
    entity_type: 'invalid_type'
  },
  duplicateName: {
    name: 'Medical History', // Same as validCategory
    description: 'Duplicate category name',
    entity_type: 'patient'
  }
};

/**
 * Invalid field definitions
 */
const invalidFields = {
  missingName: {
    label: 'Field Without Name',
    field_type: 'text'
  },
  missingType: {
    name: 'no_type_field',
    label: 'Field Without Type'
  },
  invalidType: {
    name: 'invalid_type_field',
    label: 'Invalid Type Field',
    field_type: 'invalid_type'
  },
  selectWithoutOptions: {
    name: 'select_no_options',
    label: 'Select Without Options',
    field_type: 'select'
    // Missing options array
  }
};

/**
 * Field value test data
 */
const fieldValues = {
  text: 'AB+',
  select: 'Vegetarian',
  number: 2.5,
  boolean: true,
  date: '2024-01-15',
  textarea: 'Patient has history of high blood pressure. Currently controlled with medication.',
  multiselect: ['Nuts', 'Dairy']
};

/**
 * Category update data
 */
const categoryUpdates = {
  updateName: {
    name: 'Updated Medical History'
  },
  updateDescription: {
    description: 'Updated description for medical history category'
  },
  deactivate: {
    is_active: false
  },
  reorder: {
    display_order: 5
  }
};

/**
 * Field definition update data
 */
const fieldUpdates = {
  updateLabel: {
    label: 'Updated Field Label'
  },
  makeRequired: {
    is_required: true
  },
  updateOptions: {
    options: ['Option 1', 'Option 2', 'Option 3', 'Option 4']
  },
  deactivate: {
    is_active: false
  }
};

/**
 * Translations for fields
 */
const fieldTranslations = {
  en: {
    label: 'Blood Type',
    description: 'Patient blood type',
    placeholder: 'Enter blood type'
  },
  fr: {
    label: 'Groupe sanguin',
    description: 'Groupe sanguin du patient',
    placeholder: 'Entrez le groupe sanguin'
  }
};

module.exports = {
  validCategory,
  categoriesList,
  fieldDefinitions,
  invalidCategories,
  invalidFields,
  fieldValues,
  categoryUpdates,
  fieldUpdates,
  fieldTranslations
};
