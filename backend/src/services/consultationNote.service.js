const { Op } = require('sequelize');
const db = require('../../../models');

const {
  ConsultationNote,
  ConsultationNoteEntry,
  ConsultationTemplate,
  ConsultationTemplateItem,
  CustomFieldCategory,
  CustomFieldDefinition,
  VisitCustomFieldValue,
  PatientCustomFieldValue,
  PatientMeasure,
  MeasureDefinition,
  Patient,
  Visit,
  User
} = db;

async function createNote(data, userId) {
  const { visit_id, patient_id, template_id, summary } = data;

  // Verify template exists
  const template = await ConsultationTemplate.findByPk(template_id);
  if (!template) {
    throw new Error('Template not found');
  }

  const note = await ConsultationNote.create({
    visit_id,
    patient_id,
    template_id,
    dietitian_id: userId,
    status: 'draft',
    summary
  });

  return getNoteById(note.id);
}

async function getNotes(filters = {}, user) {
  const where = {};

  if (filters.visit_id) {
    where.visit_id = filters.visit_id;
  }

  if (filters.patient_id) {
    where.patient_id = filters.patient_id;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  // RBAC: ADMIN sees all, DIETITIAN sees own
  if (user && user.role?.name !== 'ADMIN') {
    where.dietitian_id = user.id;
  }

  return ConsultationNote.findAll({
    where,
    include: [
      {
        model: ConsultationTemplate,
        as: 'template',
        attributes: ['id', 'name', 'template_type', 'color']
      },
      {
        model: Patient,
        as: 'patient',
        attributes: ['id', 'first_name', 'last_name']
      },
      {
        model: User,
        as: 'dietitian',
        attributes: ['id', 'first_name', 'last_name']
      },
      {
        model: ConsultationNoteEntry,
        as: 'entries',
        attributes: ['id', 'entry_type', 'template_item_id']
      }
    ],
    order: [['updated_at', 'DESC']]
  });
}

async function getNoteById(id, user) {
  const note = await ConsultationNote.findByPk(id, {
    include: [
      {
        model: ConsultationTemplate,
        as: 'template',
        attributes: ['id', 'name', 'template_type', 'color'],
        include: [{
          model: ConsultationTemplateItem,
          as: 'items',
          separate: true,
          order: [['display_order', 'ASC']]
        }]
      },
      {
        model: Patient,
        as: 'patient',
        attributes: ['id', 'first_name', 'last_name', 'email']
      },
      {
        model: User,
        as: 'dietitian',
        attributes: ['id', 'first_name', 'last_name']
      },
      {
        model: ConsultationNoteEntry,
        as: 'entries',
        separate: true
      }
    ]
  });

  if (!note) {
    throw new Error('Note not found');
  }

  if (user && user.role?.name !== 'ADMIN' && note.dietitian_id !== user.id) {
    throw new Error('You do not have permission to view this note');
  }

  // Enrich template items with referenced data
  const noteJson = note.toJSON();
  if (noteJson.template && noteJson.template.items) {
    const { enrichTemplateItems } = require('./consultationTemplate.service');
    // Use the raw items from the template include (they're already plain objects from toJSON)
    const rawItems = note.template.items;
    noteJson.template.items = await enrichTemplateItems(rawItems);
  }

  return noteJson;
}

/**
 * Save note values — the key method.
 * Accepts:
 *   customFieldValues: [{ definition_id, value, template_item_id }]
 *   measureValues: [{ measure_definition_id, value, template_item_id }]
 *   instructionNotes: [{ template_item_id, text }]
 *   summary: string
 */
async function saveNoteValues(noteId, payload, userId) {
  const note = await ConsultationNote.findByPk(noteId);

  if (!note) {
    throw new Error('Note not found');
  }

  if (note.dietitian_id !== userId) {
    throw new Error('You do not have permission to update this note');
  }

  const transaction = await db.sequelize.transaction();

  try {
    const { customFieldValues, measureValues, instructionNotes, summary } = payload;

    // 1. Custom field values — upsert to VisitCustomFieldValue or PatientCustomFieldValue
    if (customFieldValues && customFieldValues.length > 0) {
      for (const cfv of customFieldValues) {
        const { definition_id, value, template_item_id } = cfv;

        // Determine storage: visit-level or patient-level
        const fieldDef = await CustomFieldDefinition.findByPk(definition_id, {
          include: [{ model: CustomFieldCategory, as: 'category' }]
        });

        if (!fieldDef) continue;

        const entityTypes = fieldDef.category?.entity_types || ['patient'];
        // Match existing visitCustomField.service logic: categories with 'patient' in
        // entity_types store in patient_custom_field_values (shared across visits).
        // Only categories with ONLY 'visit' use visit_custom_field_values.
        const isPatientLevel = entityTypes.includes('patient');
        const isVisitField = !isPatientLevel && entityTypes.includes('visit') && note.visit_id;

        let valueRecord;

        if (isVisitField) {
          // Upsert into VisitCustomFieldValue
          const existing = await VisitCustomFieldValue.findOne({
            where: { visit_id: note.visit_id, field_definition_id: definition_id },
            transaction
          });

          if (existing) {
            existing.setValue(value, fieldDef.field_type, fieldDef.allow_multiple);
            existing.updated_by = userId;
            await existing.save({ transaction });
            valueRecord = existing;
          } else {
            const newVal = VisitCustomFieldValue.build({
              visit_id: note.visit_id,
              field_definition_id: definition_id,
              updated_by: userId
            });
            newVal.setValue(value, fieldDef.field_type, fieldDef.allow_multiple);
            await newVal.save({ transaction });
            valueRecord = newVal;
          }

          // Track in entries
          await upsertEntry(noteId, {
            entry_type: 'visit_custom_field',
            reference_id: valueRecord.id,
            template_item_id
          }, transaction);
        } else {
          // Upsert into PatientCustomFieldValue
          const existing = await PatientCustomFieldValue.findOne({
            where: { patient_id: note.patient_id, field_definition_id: definition_id },
            transaction
          });

          if (existing) {
            existing.setValue(value, fieldDef.field_type, fieldDef.allow_multiple);
            existing.updated_by = userId;
            await existing.save({ transaction });
            valueRecord = existing;
          } else {
            const newVal = PatientCustomFieldValue.build({
              patient_id: note.patient_id,
              field_definition_id: definition_id,
              updated_by: userId
            });
            newVal.setValue(value, fieldDef.field_type, fieldDef.allow_multiple);
            await newVal.save({ transaction });
            valueRecord = newVal;
          }

          await upsertEntry(noteId, {
            entry_type: 'patient_custom_field',
            reference_id: valueRecord.id,
            template_item_id
          }, transaction);
        }
      }
    }

    // 2. Measure values — upsert to PatientMeasure
    if (measureValues && measureValues.length > 0) {
      for (const mv of measureValues) {
        const { measure_definition_id, value, template_item_id } = mv;

        const measureDef = await MeasureDefinition.findByPk(measure_definition_id);
        if (!measureDef) continue;

        // Find existing measure for this note's session or create new
        const existingEntry = await ConsultationNoteEntry.findOne({
          where: {
            note_id: noteId,
            entry_type: 'patient_measure',
            template_item_id
          },
          transaction
        });

        let measureRecord;

        if (existingEntry && existingEntry.reference_id) {
          // Update existing patient measure
          measureRecord = await PatientMeasure.findByPk(existingEntry.reference_id, { transaction });
          if (measureRecord) {
            measureRecord.setValue(measureDef.measure_type, value);
            measureRecord.measured_at = new Date();
            await measureRecord.save({ transaction });
          }
        }

        if (!measureRecord) {
          // Create new patient measure
          measureRecord = PatientMeasure.build({
            patient_id: note.patient_id,
            measure_definition_id,
            visit_id: note.visit_id || null,
            measured_at: new Date(),
            recorded_by: userId
          });
          measureRecord.setValue(measureDef.measure_type, value);
          await measureRecord.save({ transaction });
        }

        await upsertEntry(noteId, {
          entry_type: 'patient_measure',
          reference_id: measureRecord.id,
          template_item_id
        }, transaction);
      }
    }

    // 3. Instruction notes — save note_text in ConsultationNoteEntry
    if (instructionNotes && instructionNotes.length > 0) {
      for (const ins of instructionNotes) {
        const { template_item_id, text } = ins;

        await upsertEntry(noteId, {
          entry_type: 'instruction_note',
          template_item_id,
          note_text: text
        }, transaction);
      }
    }

    // 4. Update summary
    if (summary !== undefined) {
      await note.update({ summary }, { transaction });
    }

    // Update note timestamp
    await note.update({ updated_at: new Date() }, { transaction });

    await transaction.commit();
    return getNoteById(noteId);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Upsert a ConsultationNoteEntry by (note_id, template_item_id, entry_type)
 */
async function upsertEntry(noteId, data, transaction) {
  const where = {
    note_id: noteId,
    entry_type: data.entry_type
  };

  if (data.template_item_id) {
    where.template_item_id = data.template_item_id;
  }

  const existing = await ConsultationNoteEntry.findOne({ where, transaction });

  if (existing) {
    await existing.update({
      ...(data.reference_id !== undefined && { reference_id: data.reference_id }),
      ...(data.note_text !== undefined && { note_text: data.note_text })
    }, { transaction });
    return existing;
  }

  return ConsultationNoteEntry.create({
    note_id: noteId,
    ...data
  }, { transaction });
}

async function completeNote(id, userId) {
  const note = await ConsultationNote.findByPk(id);

  if (!note) {
    throw new Error('Note not found');
  }

  if (note.dietitian_id !== userId) {
    throw new Error('You do not have permission to complete this note');
  }

  await note.update({
    status: 'completed',
    completed_at: new Date()
  });

  return getNoteById(id);
}

async function deleteNote(id, user) {
  const note = await ConsultationNote.findByPk(id);

  if (!note) {
    throw new Error('Note not found');
  }

  if (user.role?.name !== 'ADMIN' && note.dietitian_id !== user.id) {
    throw new Error('You do not have permission to delete this note');
  }

  // CASCADE deletes entries, but values in shared tables remain
  await note.destroy();
  return { success: true, message: 'Note deleted successfully' };
}

/**
 * Compile readable content from a note's entries for AI summary generation
 */
async function compileNoteContent(note) {
  const lines = [];

  for (const entry of (note.entries || [])) {
    if (entry.entry_type === 'instruction_note' && entry.note_text) {
      lines.push(`Observation : ${entry.note_text}`);
    } else if (entry.entry_type === 'patient_measure' && entry.reference_id) {
      const measure = await PatientMeasure.findByPk(entry.reference_id, {
        include: [{ model: MeasureDefinition, as: 'definition' }]
      });
      if (measure) {
        const val = measure.value_number != null ? measure.value_number : measure.value_text;
        const name = measure.definition?.name || 'Mesure';
        const unit = measure.definition?.unit || '';
        if (val != null && val !== '') {
          lines.push(`${name} : ${val}${unit ? ' ' + unit : ''}`);
        }
      }
    } else if (entry.entry_type === 'patient_custom_field' && entry.reference_id) {
      const cfv = await PatientCustomFieldValue.findByPk(entry.reference_id, {
        include: [{ model: CustomFieldDefinition, as: 'field_definition' }]
      });
      if (cfv) {
        const label = cfv.field_definition?.field_label || cfv.field_definition?.field_name || '';
        const val = cfv.value_text || (cfv.value_number != null ? cfv.value_number : null);
        if (label && val != null && val !== '') lines.push(`${label} : ${val}`);
      }
    } else if (entry.entry_type === 'visit_custom_field' && entry.reference_id) {
      const cfv = await VisitCustomFieldValue.findByPk(entry.reference_id, {
        include: [{ model: CustomFieldDefinition, as: 'field_definition' }]
      });
      if (cfv) {
        const label = cfv.field_definition?.field_label || cfv.field_definition?.field_name || '';
        const val = cfv.value_text || (cfv.value_number != null ? cfv.value_number : null);
        if (label && val != null && val !== '') lines.push(`${label} : ${val}`);
      }
    }
  }

  if (note.summary) {
    lines.push(`Notes du diététicien : ${note.summary}`);
  }

  return lines;
}

async function generateAISummary(noteId, userId) {
  const note = await ConsultationNote.findByPk(noteId, {
    include: [
      { model: Patient, as: 'patient', attributes: ['first_name', 'last_name', 'email'] },
      { model: User, as: 'dietitian', attributes: ['first_name', 'last_name'] },
      { model: ConsultationNoteEntry, as: 'entries', separate: true }
    ]
  });

  if (!note) throw new Error('Note not found');
  if (note.dietitian_id !== userId) throw new Error('You do not have permission to update this note');

  const contentLines = await compileNoteContent(note);

  const patientName = `${note.patient?.first_name || ''} ${note.patient?.last_name || ''}`.trim();
  const dietitianName = `${note.dietitian?.first_name || ''} ${note.dietitian?.last_name || ''}`.trim();
  const noteDate = note.created_at
    ? new Date(note.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '';

  const systemPrompt = `Tu es un assistant diététicien-nutritionniste. Tu génères des résumés de consultation clairs, positifs et encourageants destinés aux patients. Le résumé doit être en français, facile à lire, sans jargon médical excessif. Il doit mettre en valeur les observations clés, les progrès du patient, et les recommandations principales. Synthétise les données de façon humaine et bienveillante. Ne répète pas les valeurs brutes de façon mécanique.`;

  const userPrompt = `Génère un résumé de consultation pour le patient ${patientName}, suivi(e) par ${dietitianName} le ${noteDate}.

Données enregistrées lors de la consultation :
${contentLines.length > 0 ? contentLines.join('\n') : 'Aucune donnée enregistrée.'}

Le résumé doit :
- Être rédigé en français, sur un ton bienveillant et encourageant
- Faire entre 100 et 250 mots
- Résumer les points clés de la consultation
- Inclure des recommandations pratiques si les données le permettent
- Être adapté pour être envoyé directement au patient par email`;

  const { generateContent } = require('./aiProvider.service');
  const aiSummary = await generateContent(systemPrompt, userPrompt, { maxTokens: 600 });

  await note.update({ ai_summary: aiSummary });

  return { ai_summary: aiSummary };
}

async function sendAISummaryEmail(noteId, userId) {
  const note = await ConsultationNote.findByPk(noteId, {
    include: [
      { model: Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name', 'email'] },
      { model: User, as: 'dietitian', attributes: ['id', 'first_name', 'last_name'] }
    ]
  });

  if (!note) throw new Error('Note not found');
  if (note.dietitian_id !== userId) throw new Error('You do not have permission to update this note');
  if (!note.ai_summary) throw new Error('No AI summary generated yet');
  if (!note.patient?.email) throw new Error('Patient has no email address');

  const { sendEmail } = require('./email.service');

  const patientFirstName = note.patient.first_name || '';
  const dietitianName = `${note.dietitian?.first_name || ''} ${note.dietitian?.last_name || ''}`.trim();
  const noteDate = note.created_at
    ? new Date(note.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '';

  const htmlBody = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background: linear-gradient(135deg, #52b788, #40916c); padding: 30px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 1.4em;">Résumé de votre consultation</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Du ${noteDate}</p>
      </div>
      <div style="background: #f9f9f7; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e8e8e0;">
        <p>Bonjour ${patientFirstName},</p>
        <p>Suite à votre consultation avec ${dietitianName}, voici un résumé personnalisé de notre échange :</p>
        <div style="background: white; border-left: 4px solid #52b788; padding: 20px; border-radius: 0 8px 8px 0; margin: 20px 0; white-space: pre-line; line-height: 1.7;">
${note.ai_summary}
        </div>
        <p style="color: #666; font-size: 0.9em;">Vous retrouverez ce résumé dans votre espace patient dans la section <strong>Mes Consultations</strong>.</p>
        <p>À bientôt,<br><strong>${dietitianName}</strong></p>
      </div>
    </div>
  `;

  await sendEmail({
    to: note.patient.email,
    subject: `Résumé de votre consultation du ${noteDate}`,
    html: htmlBody,
    sendingUserId: userId
  });

  return { success: true, sent_to: note.patient.email };
}

module.exports = {
  createNote,
  getNotes,
  getNoteById,
  saveNoteValues,
  completeNote,
  deleteNote,
  generateAISummary,
  sendAISummaryEmail
};
