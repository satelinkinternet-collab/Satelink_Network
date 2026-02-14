const fs = require('fs');
const pdf = require('pdf-parse');

const pdfPath = '/Users/pradeepjakuraa/satelink-mvp/satelink Developer -Master Scope & arcitech /Satelink_Full_Master_Technical_and_Economic_Specification.pdf';
const outPath = '/Users/pradeepjakuraa/satelink-mvp/scope.txt';

console.log(`Extracting text from: ${pdfPath}`);

if (!fs.existsSync(pdfPath)) {
    console.error("PDF not found!");
    process.exit(1);
}

const dataBuffer = fs.readFileSync(pdfPath);

pdf(dataBuffer).then(function (data) {
    fs.writeFileSync(outPath, data.text);
    console.log(`Success! Extracted ${data.text.length} characters to ${outPath}`);
}).catch(err => {
    console.error("Extraction failed:", err);
    process.exit(1);
});
