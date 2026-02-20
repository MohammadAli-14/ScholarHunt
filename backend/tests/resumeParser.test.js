import { extractWithRegex } from '../utils/resumeParser.js';
import assert from 'assert';
import { test } from 'node:test';

test('Resume Parser - Skills Extraction', (t) => {
    const text = `
    Jane Doe
    Software Engineer
    
    Skills:
    - JavaScript, Python, Java
    - React, Node.js, Angular
    - SQL, MongoDB, AWS
    - Docker, Kubernetes
    
    Experience:
    2020 - Present
    Senior Developer at Tech Corp
    `;

    const result = extractWithRegex(text);
    
    console.log('Extracted Skills:', result.skills);

    assert.ok(result.skills.includes('Javascript'), 'Should extract Javascript');
    assert.ok(result.skills.includes('Python'), 'Should extract Python');
    assert.ok(result.skills.includes('Java'), 'Should extract Java');
    assert.ok(result.skills.includes('React'), 'Should extract React');
    assert.ok(result.skills.includes('Node.js'), 'Should extract Node.js');
    assert.ok(result.skills.includes('Mongodb'), 'Should extract Mongodb');
    assert.ok(result.skills.includes('Aws'), 'Should extract Aws');
});

test('Resume Parser - Experience Extraction', (t) => {
    const text = `
    Jane Doe
    
    Experience
    
    2018 - 2020
    Junior Developer at Startup Inc
    Worked on frontend.
    
    2020 - Present
    Senior Developer at Tech Corp
    Leading the team.
    `;

    const result = extractWithRegex(text);
    
    console.log('Extracted Experience:', result.experience);

    assert.ok(result.experience.length >= 2, 'Should extract at least 2 experience entries');
    assert.strictEqual(result.experience[0].duration, '2018 - 2020');
    assert.strictEqual(result.experience[1].duration, '2020 - Present');
});

test('Resume Parser - Country Extraction', (t) => {
    const text = `
    John Smith
    123 Main St, New York, NY
    United States
    `;
    const result = extractWithRegex(text);
    assert.strictEqual(result.country, 'USA', 'Should extract USA');

    const text2 = `
    Priya Sharma
    Bangalore, India
    `;
    const result2 = extractWithRegex(text2);
    assert.strictEqual(result2.country, 'India', 'Should extract India');
    
    const text3 = `
    Hans Mueller
    Munich, Germany
    `;
    const result3 = extractWithRegex(text3);
    assert.strictEqual(result3.country, 'Germany', 'Should extract Germany');
});
