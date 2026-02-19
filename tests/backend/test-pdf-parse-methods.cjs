// Test to find the correct methods on PDFParse instance
const pdfParse = require('pdf-parse');

console.log('Testing PDFParse instance methods...');

const minimalPDF = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

try {
    const parser = new pdfParse.PDFParse(minimalPDF);
    console.log('Parser instance created successfully');
    
    // Check all methods and properties on the instance
    console.log('Instance methods:');
    for (const key in parser) {
        if (typeof parser[key] === 'function') {
            console.log(`  ${key}: function`);
        } else {
            console.log(`  ${key}: ${typeof parser[key]}`);
        }
    }
    
    // Check if there's a method to extract text
    console.log('\nLooking for text extraction methods...');
    
    // Try common method names
    const commonMethods = ['getText', 'extractText', 'text', 'parse', 'execute', 'run'];
    for (const method of commonMethods) {
        if (typeof parser[method] === 'function') {
            console.log(`Found method: ${method}`);
            try {
                const result = parser[method]();
                console.log(`${method}() result:`, result);
            } catch (error) {
                console.log(`${method}() error:`, error.message);
            }
        }
    }
    
} catch (error) {
    console.log('Error:', error.message);
    console.log('Stack:', error.stack);
}