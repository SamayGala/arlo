import 'cypress-file-upload'

before(() => cy.exec('./cypress/seed-test-db.sh'))

describe('Batch Comparison', () => {
    const auditAdmin = 'audit-admin-cypress@example.com'
    const jurisdictionAdmin = 'wtarkin@empire.gov'
    const uuid = () => Cypress._.random(0, 1e6)
    let id = 0

    beforeEach(() => {
        id = uuid()
        cy.visit('/')
        cy.loginAuditAdmin('audit-admin-cypress@example.com')
        cy.get('input[name=auditName]').type(`TestAudit${id}`)
        cy.get('input[value="BATCH_COMPARISON"]').check({ force: true })
        cy.findByText("Create Audit").click()
        cy.contains("Audit Setup")
    })

    it('Participating Jurisdictions - File errors', () => {
        cy.findAllByText('Upload File').spread((firstButton, secondButton) => {
            firstButton.click()
        })
        cy.contains("You must upload a file") 
        cy.fixture('CSVs/jurisdiction/sample_jurisdiction_filesheet_jurisdiction_col_error.csv').then(fileContent => {
            cy.get('input[type="file"]').first().attachFile({
                fileContent: fileContent.toString(),
                fileName: 'sample_jurisdiction_filesheet_jurisdiction_col_error.csv',
                mimeType: 'csv'
            })
        })
        cy.findAllByText('Upload File').spread((firstButton, secondButton) => {
            firstButton.click()
        })
        cy.get('.Toastify').get('.Toastify__toast-body').should('be.visible').contains('Missing required CSV field "Jurisdiction"').invoke('text')
        .then((text)=>{
            const toastText = text;
            expect(toastText).to.equal('Missing required CSV field "Jurisdiction"');
        })
        cy.get('.Toastify').find('div').should('not.have.class', 'Toastify__bounce-exit--top-right').get('.Toastify__close-button').click()

        cy.fixture('CSVs/jurisdiction/sample_jurisdiction_filesheet_admin_email_col_error.csv').then(fileContent => {
            cy.get('input[type="file"]').first().attachFile({
                fileContent: fileContent.toString(),
                fileName: 'sample_jurisdiction_filesheet_admin_email_col_error.csv',
                mimeType: 'csv'
            })
        })
        cy.findAllByText('Upload File',{timeout: 6000}).spread((firstButton, secondButton) => {
            firstButton.click()
        })
        cy.get('.Toastify').get('.Toastify__toast-body').should('be.visible').contains('Missing required CSV field "Admin Email"').invoke('text')
        .then((text)=>{
            const toastText = text;
            expect(toastText).to.equal('Missing required CSV field "Admin Email"');
        })
        cy.get('.Toastify').find('div').should('not.have.class', 'Toastify__bounce-exit--top-right').get('.Toastify__close-button').click()

        cy.fixture('CSVs/jurisdiction/sample_jurisdiction_filesheet_email_ID_error.csv').then(fileContent => {
            cy.get('input[type="file"]').first().attachFile({
                fileContent: fileContent.toString(),
                fileName: 'sample_jurisdiction_filesheet_email_ID_error.csv',
                mimeType: 'csv'
            })
        })
        cy.findAllByText('Upload File').spread((firstButton, secondButton) => {
            firstButton.click()
        })
        cy.contains("Expected an email address in column Admin Email")
    })

    it('Total Ballots Cast less than total of Candidates', () => {
        cy.fixture('CSVs/jurisdiction/sample_jurisdiction_filesheet.csv').then(fileContent => {
            cy.get('input[type="file"]').first().attachFile({
            fileContent: fileContent.toString(),
            fileName: 'sample_jurisdiction_filesheet.csv',
            mimeType: 'csv'
            })
        })
        cy.findAllByText('Upload File').spread((firstButton, secondButton) => {
        firstButton.click()
        })
        cy.contains("Upload successfully completed")   
        cy.get('button[type="submit"]').should('not.have.class', 'bp3-disabled').click()
        cy.findAllByText('Target Contests').should('have.length', 2)
        cy.get('input[name="contests[0].name"]').type('Contest')
        cy.findByLabelText('Name of Candidate/Choice 1').type('Vader')
        cy.findByLabelText('Votes for Candidate/Choice 1').type('2700')
        cy.findByLabelText('Name of Candidate/Choice 2').type('Palpatine')
        cy.findByLabelText('Votes for Candidate/Choice 2').type('2620')
        cy.findByLabelText('Total Ballots for Contest').type('4000').blur()
        cy.contains('Must be greater than or equal to the sum of votes for each candidate/choice')
    })

    it('Ballot Manifest - File Errors', () => {
        cy.fixture('CSVs/jurisdiction/sample_jurisdiction_filesheet.csv').then(fileContent => {
            cy.get('input[type="file"]').first().attachFile({
            fileContent: fileContent.toString(),
            fileName: 'sample_jurisdiction_filesheet.csv',
            mimeType: 'csv'
            })
        })
        cy.findAllByText('Upload File').spread((firstButton, secondButton) => {
        firstButton.click()
        })
        cy.contains("Upload successfully completed")   
        cy.get('button[type="submit"]').should('not.have.class', 'bp3-disabled').click()
        cy.findAllByText('Target Contests').should('have.length', 2)
        cy.get('input[name="contests[0].name"]').type('Contest')
        cy.findByLabelText('Name of Candidate/Choice 1').type('Vader')
        cy.findByLabelText('Votes for Candidate/Choice 1').type('2700')
        cy.findByLabelText('Name of Candidate/Choice 2').type('Palpatine')
        cy.findByLabelText('Votes for Candidate/Choice 2').type('2620')
        cy.findByLabelText('Total Ballots for Contest').type('5320')
        cy.findByText('Select Jurisdictions').click()
        cy.findByLabelText('Death Star').check({ force: true })
        cy.findByText('Save & Next').click()
        cy.findAllByText('Audit Settings').should('have.length', 2)
        cy.get('#state').select('AL')
        cy.get('input[name=electionName]').type(`Test Election`)
        cy.get('#risk-limit').select('10')
        cy.get('input[name=randomSeed]').type("543210")
        cy.findByText('Save & Next').click()
        cy.findAllByText('Review & Launch').should('have.length', 2)
        cy.logout(auditAdmin)
        cy.contains('Participating in an audit in your local jurisdiction?')
        cy.loginJurisdictionAdmin('wtarkin@empire.gov')
        cy.findByText(`Jurisdictions - TestAudit${id}`).siblings('button').click()
        cy.findAllByText('Upload File').spread((firstButton, secondButton) => {
            firstButton.click()
        })
        cy.contains("You must upload a file")
        cy.fixture('CSVs/manifest/batch_comparison_manifest_col_error.csv').then(fileContent => {
        cy.get('input[type="file"]').first().attachFile({
            fileContent: fileContent.toString(),
            fileName: 'batch_comparison_manifest_col_error.csv',
            mimeType: 'csv'
        })
        })
        cy.findAllByText('Upload File').spread((firstButton, secondButton) => {
        firstButton.click()
        })
        cy.contains("Missing required column: Number of Ballots.")
    })

    it('Candidate Totals by Batch - File errors', () => {
        cy.fixture('CSVs/jurisdiction/sample_jurisdiction_filesheet.csv').then(fileContent => {
            cy.get('input[type="file"]').first().attachFile({
            fileContent: fileContent.toString(),
            fileName: 'sample_jurisdiction_filesheet.csv',
            mimeType: 'csv'
            })
        })
        cy.findAllByText('Upload File').spread((firstButton, secondButton) => {
        firstButton.click()
        })
        cy.contains("Upload successfully completed")   
        cy.get('button[type="submit"]').should('not.have.class', 'bp3-disabled').click()
        cy.findAllByText('Target Contests').should('have.length', 2)
        cy.get('input[name="contests[0].name"]').type('Contest')
        cy.findByLabelText('Name of Candidate/Choice 1').type('Vader')
        cy.findByLabelText('Votes for Candidate/Choice 1').type('2700')
        cy.findByLabelText('Name of Candidate/Choice 2').type('Palpatine')
        cy.findByLabelText('Votes for Candidate/Choice 2').type('2620')
        cy.findByLabelText('Total Ballots for Contest').type('5320')
        cy.findByText('Select Jurisdictions').click()
        cy.findByLabelText('Death Star').check({ force: true })
        cy.findByText('Save & Next').click()
        cy.findAllByText('Audit Settings').should('have.length', 2)
        cy.get('#state').select('AL')
        cy.get('input[name=electionName]').type(`Test Election`)
        cy.get('#risk-limit').select('10')
        cy.get('input[name=randomSeed]').type("543210")
        cy.findByText('Save & Next').click()
        cy.findAllByText('Review & Launch').should('have.length', 2)
        cy.logout(auditAdmin)
        cy.contains('Participating in an audit in your local jurisdiction?')
        cy.loginJurisdictionAdmin('wtarkin@empire.gov')
        cy.findByText(`Jurisdictions - TestAudit${id}`).siblings('button').click()
        cy.fixture('CSVs/manifest/batch_comparison_manifest.csv').then(fileContent => {
        cy.get('input[type="file"]').first().attachFile({
                fileContent: fileContent.toString(),
                fileName: 'batch_comparison_manifest.csv',
                mimeType: 'csv'
            })
        })
        cy.findAllByText('Upload File').spread((firstButton, secondButton) => {
            firstButton.click()
        })
        cy.contains("Upload successfully completed")

        cy.findAllByText('Upload File').last().click()
        cy.contains("You must upload a file")
        cy.fixture('CSVs/manifest/batch_comparison_manifest.csv').then(fileContent => {
        cy.get('input[type="file"]').first().attachFile({
                fileContent: fileContent.toString(),
                fileName: 'batch_comparison_manifest.csv',
                mimeType: 'csv'
            })
        })
        cy.findAllByText('Upload File').last().click()
        cy.contains('Missing required columns: Palpatine, Vader.')
    })
})
