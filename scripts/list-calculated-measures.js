const db = require('../models');

async function listCalculatedMeasures() {
  try {
    const measures = await db.MeasureDefinition.findAll({
      where: { measure_type: 'calculated' },
      order: [['display_order', 'ASC'], ['display_name', 'ASC']]
    });

    console.log('\n📊 Calculated Measures in Database:\n');
    console.log('═'.repeat(80));

    if (measures.length === 0) {
      console.log('No calculated measures found.');
    } else {
      measures.forEach((measure, index) => {
        console.log(`\n${index + 1}. ${measure.display_name} (${measure.name})`);
        console.log(`   Category: ${measure.category}`);
        console.log(`   Unit: ${measure.unit || 'N/A'}`);
        console.log(`   Formula: ${measure.formula}`);
        console.log(`   Dependencies: ${JSON.stringify(measure.dependencies)}`);
        console.log(`   Active: ${measure.is_active ? '✅' : '❌'}`);
      });
    }

    console.log('\n' + '═'.repeat(80));
    console.log(`\nTotal: ${measures.length} calculated measure(s)\n`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listCalculatedMeasures();
