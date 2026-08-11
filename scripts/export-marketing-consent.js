const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const root = process.cwd();
const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const outputFlag = process.argv.indexOf('--output');
const outputFile = outputFlag === -1 ? '' : process.argv[outputFlag + 1];
const outputPath = outputFile ? path.resolve(outputFile) : '';
const stdoutRequested = process.argv.includes('--stdout');

if (!url || !secret) {
  console.error('Set SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) before exporting.');
  process.exit(1);
}

if (!outputFile && !stdoutRequested) {
  console.error('Choose a private output file with --output. Use --stdout only for an intentional pipe to another secure process.');
  process.exit(1);
}

if (outputPath && (outputPath === root || outputPath.startsWith(root + path.sep))) {
  console.error('Choose an output file outside the Git project so personal data cannot be committed accidentally.');
  process.exit(1);
}

function csvCell(value) {
  let text = value == null ? '' : String(value);
  // Prevent spreadsheet applications from treating exported personal data as a formula.
  if (/^[\t\r ]*[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

async function run() {
  const supabase = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });
  const data = [];
  const pageSize = 500;
  let offset = 0;
  let expectedTotal = null;
  while (expectedTotal === null || offset < expectedTotal) {
    const { data: page, error, count } = await supabase
      .from('profiles')
      .select('id, email, marketing_consent_at, marketing_consent_source, marketing_consent_text_version', { count: 'exact' })
      .eq('marketing_consent', true)
      .not('email_confirmed_at', 'is', null)
      .order('marketing_consent_at', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    if (expectedTotal === null) expectedTotal = count ?? 0;
    if (!page?.length) break;
    data.push(...page);
    offset += page.length;
  }
  const headings = ['email', 'consented_at', 'source', 'consent_text_version'];
  const lines = [headings.join(',')].concat((data || []).map(row => [
    row.email,
    row.marketing_consent_at,
    row.marketing_consent_source,
    row.marketing_consent_text_version
  ].map(csvCell).join(',')));
  const csv = lines.join('\n') + '\n';

  if (outputFile) {
    const descriptor = fs.openSync(outputPath, 'w', 0o600);
    try {
      fs.writeFileSync(descriptor, csv);
      fs.fchmodSync(descriptor, 0o600);
    } finally {
      fs.closeSync(descriptor);
    }
    console.error(`Exported ${data.length} opted-in address${data.length === 1 ? '' : 'es'} to ${outputPath}.`);
  } else {
    process.stdout.write(csv);
  }
}

run().catch(error => {
  console.error('Marketing export failed:', error.message || error);
  process.exit(1);
});
