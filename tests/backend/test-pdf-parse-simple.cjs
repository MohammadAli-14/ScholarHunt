// Simple test to understand pdf-parse usage
const pdfParse = require('pdf-parse');

console.log('Testing pdf-parse basic usage...');
console.log('Module type:', typeof pdfParse);
console.log('Module keys:', Object.keys(pdfParse));

// Let's try to see what PDFParse constructor expects
if (pdfParse.PDFParse) {
    console.log('PDFParse found, checking constructor...');
    console.log('PDFParse function length:', pdfParse.PDFParse.length);
    
    // Try to see what the constructor expects by looking at the source
    const source = pdfParse.PDFParse.toString();
    console.log('Constructor source (first 200 chars):', source.substring(0, 200));
    
    // Try creating an instance with minimal parameters
    try {
        const minimalPDF = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
        const parser = new pdfParse.PDFParse(minimalPDF);
        console.log('Parser instance created successfully');
        
        // Try to call parse
        if (typeof parser.parse === 'function') {
            const result = parser.parse();
            console.log('Parse result:', result);
        } else {
            console.log('No parse method on instance');
        }
    } catch (error) {
        console.log('Error creating parser instance:', error.message);
        console.log('Error stack:', error.stack);
    }
}