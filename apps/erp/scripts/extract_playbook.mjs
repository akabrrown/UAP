import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

try {
  const docxPath = 'c:/Users/Dell/Desktop/PROjects/UAP/UAP_07_Multi_Agent_Test_Playbook.docx';
  if (fs.existsSync(docxPath)) {
    const zip = new AdmZip(docxPath);
    const xml = zip.readAsText('word/document.xml');
    const text = xml
      .replace(/<w:p[ >]/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
    fs.writeFileSync('c:/Users/Dell/Desktop/PROjects/UAP/playbook_extracted.txt', text);
    console.log('Extracted playbook to playbook_extracted.txt, length:', text.length);
  } else {
    console.log('Docx not found at:', docxPath);
  }

  // Also inspect uat-pack.zip if present
  const zipPath = 'C:/Users/Dell/.gemini/antigravity/brain/492aa2f1-e22e-41aa-9f5d-0ad9ab07c955/.user_uploaded/media_1793701956849_c3a94bf3.zip';
  if (fs.existsSync(zipPath)) {
    const uatZip = new AdmZip(zipPath);
    const entries = uatZip.getEntries().map(e => e.entryName);
    console.log('UAT Zip entries:', entries);
    uatZip.extractAllTo('c:/Users/Dell/Desktop/PROjects/UAP/uat-pack', true);
    console.log('Extracted uat-pack to c:/Users/Dell/Desktop/PROjects/UAP/uat-pack');
  }
} catch (e) {
  console.error(e);
}
