'use strict';

const
    register_new_user_func = require('../../lib/register_new_user'),
    open_page_func = require('../../lib/open_page'),
    submit_form_func = require('../../lib/submit_form'),
    check_elements_func = require('../../lib/check_elements'),
    config = require('../../lib/config'),
    application_host = config.get_application_host(),
    By = require('selenium-webdriver').By;

describe('Verify user creation and login', function () {
    let driver;

    this.timeout(config.get_execution_timeout());

    it('Performing registration process', function (done) {
        register_new_user_func({ application_host })
            .then((data) => {
                driver = data.driver;
                done();
            });
    });

    it("Create a new user through the UI", function (done) {
        open_page_func({
            driver,
            url: application_host + 'users/add/',
        })
            .then(() => submit_form_func({
                driver,
                form_params: [{
                    selector: 'input[name="name"]',
                    value: 'Test',
                }, {
                    selector: 'input[name="lastname"]',
                    value: 'User',
                }, {
                    selector: 'input[name="email_address"]',
                    value: 'testlogin@example.com',
                }, {
                    selector: 'input[name="password_one"]',
                    value: '123456',
                }, {
                    selector: 'input[name="password_confirm"]',
                    value: '123456',
                }],
                submit_button_selector: 'button#save_changes_btn',
                message: /New user account successfully added/,
            }))
            .then(() => done());
    });

    it("Logout and try to login as the new user", function (done) {
        driver.get(application_host + 'logout')
            .then(() => open_page_func({
                driver,
                url: application_host + 'login',
            }))
            .then(() => submit_form_func({
                driver,
                form_params: [{
                    selector: 'input[name="username"]',
                    value: 'testlogin@example.com',
                }, {
                    selector: 'input[name="password"]',
                    value: '123456',
                }],
                submit_button_selector: 'button#login_btn',
                message: /Welcome back Test!/,
            }))
            .then(() => done());
    });

    after(function (done) {
        driver.quit().then(function () { done(); });
    });

});
