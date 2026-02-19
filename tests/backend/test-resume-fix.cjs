// Test the fixed resume parser
const { parseResume } = require('./backend/utils/resumeParser.cjs');
const fs = require('fs');
const path = require('path');

async function testResumeParser() {
    // Create a test PDF file
    const testPdfPath = path.join(__dirname, 'test-resume.pdf');
    const minimalPDFContent = '%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF';

    // Write test file
    fs.writeFileSync(testPdfPath, minimalPDFContent);

    console.log('Testing fixed resume parser...');

    // Test the parser
    try {
        const result = await parseResume(testPdfPath);
        console.log('✅ Resume parsing successful!');
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.log('❌ Resume parsing failed:', error.message);
        console.log('Error details:', error);
    }

    // Cleanup
    if (fs.existsSync(testPdfPath)) {
        fs.unlinkSync(testPdfPath);
    }
}

// Run the test
testResumeParser().catch(console.error);