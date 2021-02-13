import 'cypress-file-upload'

before(() => cy.exec('./cypress/seed-test-db.sh'))

describe('Ballot Polling', () => {
    const auditAdmin = 'audit-admin-cypress@example.com'
    const jurisdictionAdmin = 'wtarkin@empire.gov'
    const uuid = () => Cypress._.random(0, 1e6)
    let id = 0
    let board_credentials_url = ''

    beforeEach(() => {
        id = uuid()
        cy.visit('/')
        cy.loginAuditAdmin(auditAdmin)
        cy.get('input[name=auditName]').type(`TestAudit${id}`)
        cy.get('input[value="BALLOT_POLLING"]').check({ force: true })
        cy.get('input[value="BRAVO"]').check({ force: true })
        cy.findByText('Create Audit').click()
        cy.contains('Audit Setup')
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
        cy.get('input[name="contests[0].name"]').type('Contest')
        cy.get('input[name="contests[0].choices[0].name"]').type('A')
        cy.get('input[name="contests[0].choices[0].numVotes"]').type('300')
        cy.get('input[name="contests[0].choices[1].name"]').type('B')
        cy.get('input[name="contests[0].choices[1].numVotes"]').type('100')
        cy.get('input[name="contests[0].totalBallotsCast"]').type('200').blur()
        cy.contains('Must be greater than or equal to the sum of votes for each candidate/choice')
    })

    it('Ballot Manifest - File Errors (Ballot Polling Offline)', () => {
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
        cy.get('input[name="contests[0].name"]').type('Contest')
        cy.get('input[name="contests[0].choices[0].name"]').type('A')
        cy.get('input[name="contests[0].choices[0].numVotes"]').type('300')
        cy.get('input[name="contests[0].choices[1].name"]').type('B')
        cy.get('input[name="contests[0].choices[1].numVotes"]').type('100')
        cy.get('input[name="contests[0].totalBallotsCast"]').type('400')
        cy.findByText('Select Jurisdictions').click()
        cy.findByLabelText('Death Star').check({ force: true })
        cy.findByText('Save & Next').click()
        cy.findAllByText('Opportunistic Contests').should('have.length', 2)
        cy.findByText('Save & Next').click()
        cy.get("input[value=online]").click({ force: true })
        cy.findByRole('combobox', {name: /Choose your state from the options below/}).select('AL')
        cy.findByLabelText('Enter the name of the election you are auditing.').type('Test Election')
        cy.findByRole('combobox', {name: /Set the risk limit for the audit/}).select('10')
        cy.findByLabelText('Enter the random characters to seed the pseudo-random number generator.').type('543210')
        cy.findByText('Save & Next').click()
        cy.findAllByText('Review & Launch').should('have.length', 2)
        cy.logout(auditAdmin)
        cy.loginJurisdictionAdmin(jurisdictionAdmin)
        cy.findByText(`Jurisdictions - TestAudit${id}`).siblings('button').click()
        cy.findAllByText('Upload File').spread((firstButton, secondButton) => {
            firstButton.click()
        })
        cy.contains("You must upload a file")
        cy.fixture('CSVs/manifest/ballot_polling_manifest_col_error.csv').then(fileContent => {
        cy.get('input[type="file"]').first().attachFile({
            fileContent: fileContent.toString(),
            fileName: 'ballot_polling_manifest_col_error.csv',
            mimeType: 'csv'
        })
        })
        cy.findAllByText('Upload File').spread((firstButton, secondButton) => {
        firstButton.click()
        })
        cy.contains("Missing required column: Number of Ballots.")
    })

    it('Audit Board - Submit empty Ballot Error (Ballot Polling Online)', () => {
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
        cy.get('input[name="contests[0].name"]').type('Contest')
        cy.get('input[name="contests[0].choices[0].name"]').type('A')
        cy.get('input[name="contests[0].choices[0].numVotes"]').type('300')
        cy.get('input[name="contests[0].choices[1].name"]').type('B')
        cy.get('input[name="contests[0].choices[1].numVotes"]').type('100')
        cy.get('input[name="contests[0].totalBallotsCast"]').type('400')
        cy.findByText('Select Jurisdictions').click()
        cy.findByLabelText('Death Star').check({ force: true })
        cy.findByText('Save & Next').click()
        cy.findAllByText('Opportunistic Contests').should('have.length', 2)
        cy.findByText('Save & Next').click()
        cy.get("input[value=online]").click({ force: true })
        cy.findByRole('combobox', {name: /Choose your state from the options below/}).select('AL')
        cy.findByLabelText('Enter the name of the election you are auditing.').type('Test Election')
        cy.findByRole('combobox', {name: /Set the risk limit for the audit/}).select('10')
        cy.findByLabelText('Enter the random characters to seed the pseudo-random number generator.').type('543210')
        cy.findByText('Save & Next').click()
        cy.findAllByText('Review & Launch').should('have.length', 2)
        cy.logout(auditAdmin)
        cy.loginJurisdictionAdmin(jurisdictionAdmin)
        cy.findByText(`Jurisdictions - TestAudit${id}`).siblings('button').click()
        cy.fixture('CSVs/manifest/ballot_polling_manifest.csv').then(fileContent => {
            cy.get('input[type="file"]').first().attachFile({
                fileContent: fileContent.toString(),
                fileName: 'ballot_polling_manifest.csv',
                mimeType: 'csv'
            })
        })
        cy.findByText('Upload File').click()
        cy.contains("Upload successfully completed")
        cy.logout(jurisdictionAdmin)
        cy.loginAuditAdmin(auditAdmin)
        cy.findByText(`TestAudit${id}`).click()
        cy.findByText('Review & Launch').click()
        cy.findAllByText('Review & Launch').should('have.length', 2)
        cy.findByText('Launch Audit').click()
        cy.findAllByText('Launch Audit').spread((firstButton, secondButton) => {
        secondButton.click()
        })
        // cy.contains('Audit Progress')
        // cy.contains('Drawing a random sample of ballots...')
        cy.get('table').should('be.visible')
        cy.get('tbody').children('tr').its('length').should('be.gt', 0) // ensures ballot drawing is done
        cy.logout(auditAdmin)
        cy.loginJurisdictionAdmin(jurisdictionAdmin)
        cy.findByText(`Jurisdictions - TestAudit${id}`).siblings('button').click()
        cy.contains('Number of Audit Boards')
        cy.findByText('Save & Next').click()
        cy.findByText('Download Audit Board Credentials').click()
        cy.logout(jurisdictionAdmin)
        cy.task('getPdfContent', `cypress/downloads/Audit Board Credentials\ -\ Death Star\ -\ TestAudit${id}.pdf`).then((content) => {
        function urlify(text) {
            var urlRegex = /(((https?:\/\/)|(www\.))[^\s]+)/g;
            return text.match(urlRegex, function(url) {
            return url
            }) 
        }
        board_credentials_url = urlify(content.text);
        cy.visit(board_credentials_url[0])
        cy.findAllByText('Audit Board Member').eq(0).siblings('input').type('Board Member 1')
        cy.findAllByText('Audit Board Member').eq(1).siblings('input').type('Board Member 2')
        cy.findByText('Next').click()
        cy.contains(/Ballot Cards to Audit/)
        cy.findByText('Start Auditing').click()
        cy.findByText('Review').click() 
        cy.findByText('Submit & Next Ballot').click() 
        cy.get('.Toastify').get('.Toastify__toast-body').should('be.visible').contains('Must include an interpretation for each contest.').invoke('text')
            .then((text) => {
                const toastText = text
                expect(toastText).to.equal('Must include an interpretation for each contest.')
            }) 
        })
    })

    it('Audit Board - Incorrect Member Names while Sign off (Ballot Polling Online)', () => {
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
        cy.get('input[name="contests[0].name"]').type('Contest')
        cy.get('input[name="contests[0].choices[0].name"]').type('A')
        cy.get('input[name="contests[0].choices[0].numVotes"]').type('300')
        cy.get('input[name="contests[0].choices[1].name"]').type('B')
        cy.get('input[name="contests[0].choices[1].numVotes"]').type('100')
        cy.get('input[name="contests[0].totalBallotsCast"]').type('400')
        cy.findByText('Select Jurisdictions').click()
        cy.findByLabelText('Death Star').check({ force: true })
        cy.findByText('Save & Next').click()
        cy.findAllByText('Opportunistic Contests').should('have.length', 2)
        cy.findByText('Save & Next').click()
        cy.get("input[value=online]").click({ force: true })
        cy.findByRole('combobox', {name: /Choose your state from the options below/}).select('AL')
        cy.findByLabelText('Enter the name of the election you are auditing.').type('Test Election')
        cy.findByRole('combobox', {name: /Set the risk limit for the audit/}).select('10')
        cy.findByLabelText('Enter the random characters to seed the pseudo-random number generator.').type('543210')
        cy.findByText('Save & Next').click()
        cy.findAllByText('Review & Launch').should('have.length', 2)
        cy.logout(auditAdmin)
        cy.loginJurisdictionAdmin(jurisdictionAdmin)
        cy.findByText(`Jurisdictions - TestAudit${id}`).siblings('button').click()
        cy.fixture('CSVs/manifest/ballot_polling_manifest.csv').then(fileContent => {
            cy.get('input[type="file"]').first().attachFile({
                fileContent: fileContent.toString(),
                fileName: 'ballot_polling_manifest.csv',
                mimeType: 'csv'
            })
        })
        cy.findByText('Upload File').click()
        cy.contains("Upload successfully completed")
        cy.logout(jurisdictionAdmin)
        cy.loginAuditAdmin(auditAdmin)
        cy.findByText(`TestAudit${id}`).click()
        cy.findByText('Review & Launch').click()
        cy.findAllByText('Review & Launch').should('have.length', 2)
        cy.findByText('Launch Audit').click()
        cy.findAllByText('Launch Audit').spread((firstButton, secondButton) => {
        secondButton.click()
        })
        // cy.contains('Audit Progress')
        // cy.contains('Drawing a random sample of ballots...')
        cy.get('table').should('be.visible')
        cy.get('tbody').children('tr').its('length').should('be.gt', 0) // ensures ballot drawing is done
        cy.logout(auditAdmin)
        cy.loginJurisdictionAdmin(jurisdictionAdmin)
        cy.findByText(`Jurisdictions - TestAudit${id}`).siblings('button').click()
        cy.contains('Number of Audit Boards')
        cy.findByText('Save & Next').click()
        cy.findByText('Download Audit Board Credentials').click()
        cy.logout(jurisdictionAdmin)
        cy.task('getPdfContent', `cypress/downloads/Audit Board Credentials\ -\ Death Star\ -\ TestAudit${id}.pdf`).then((content) => {
            function urlify(text) {
                var urlRegex = /(((https?:\/\/)|(www\.))[^\s]+)/g;
                return text.match(urlRegex, function(url) {
                return url
                }) 
            }
            board_credentials_url = urlify(content.text);
            cy.visit(board_credentials_url[0])
            cy.findAllByText('Audit Board Member').eq(0).siblings('input').type('Board Member 1')
            cy.findAllByText('Audit Board Member').eq(1).siblings('input').type('Board Member 2')
            cy.findByText('Next').click()
            cy.contains(/Ballot Cards to Audit/)
            cy.get('table tbody tr').each(($el, index, list) => {
                // iterate through exactly the number of ballots available to avoid conditions
                if(index == 0) {
                cy.findByText('Start Auditing').click()
                }
                cy.get('input[type="checkbox"]').first().click({force: true})
                cy.findByText('Review').click() 
                cy.findByText('Submit & Next Ballot').click() 
            })
            cy.wait(100)
            cy.findByText('Auditing Complete - Submit Results').click()
            cy.findAllByText('Audit Board Member: Board Member 1').siblings('input').type('Member 1')
            cy.findAllByText('Audit Board Member: Board Member 2').siblings('input').type('Board Member 2')
            cy.findByText('Sign Off').should('not.be.disabled').click()
            cy.get('.Toastify').get('.Toastify__toast-body').should('be.visible').contains('Audit board member name did not match: Member 1').invoke('text')
            .then((text)=>{
                const toastText = text;
                expect(toastText).to.equal('Audit board member name did not match: Member 1');
            })
        })
    })
})