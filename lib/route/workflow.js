"use strict";

const
    express = require('express'),
    router = express.Router(),
    validator = require('validator'),
    Promise = require('bluebird'),
    _ = require('underscore');

// Ensure only admins can access
router.all(/.*/, require('../middleware/ensure_user_is_admin'));

router.get('/workflow/', async (req, res) => {
    const db = req.app.get('db_model');
    const companyId = req.user.companyId;

    const [roles, areas, teams, projects] = await Promise.all([
        db.Role.findAll({ where: { companyId } }),
        db.Area.findAll({ where: { companyId } }),
        db.Team.findAll({ where: { companyId } }),
        db.Project.findAll({ where: { companyId } }),
    ]);

    res.render('settings_workflow', {
        roles, areas, teams, projects,
        title: 'Workflow Settings'
    });
});

// Roles
router.post('/workflow/roles/add/', async (req, res) => {
    const db = req.app.get('db_model');
    const name = validator.trim(req.body.name);
    const weight = validator.isInt(req.body.priority_weight) ? parseInt(req.body.priority_weight) : 0;

    await db.Role.create({
        name,
        priority_weight: weight,
        companyId: req.user.companyId
    });

    req.session.flash_message('Role added');
    res.redirect_with_session('/settings/workflow/');
});

router.post('/workflow/roles/update/', async (req, res) => {
    const db = req.app.get('db_model');
    const id = req.body.id;
    const name = validator.trim(req.body.name);
    const weight = validator.isInt(req.body.priority_weight) ? parseInt(req.body.priority_weight) : 0;

    await db.Role.update({
        name,
        priority_weight: weight
    }, {
        where: { id, companyId: req.user.companyId }
    });

    req.session.flash_message('Role updated');
    res.redirect_with_session('/settings/workflow/');
});

router.post('/workflow/roles/delete/', async (req, res) => {
    const db = req.app.get('db_model');
    const id = req.body.id;

    await db.Role.destroy({
        where: { id, companyId: req.user.companyId }
    });

    req.session.flash_message('Role deleted');
    res.redirect_with_session('/settings/workflow/');
});

// Areas
router.post('/workflow/areas/add/', async (req, res) => {
    const db = req.app.get('db_model');
    const name = validator.trim(req.body.name);

    await db.Area.create({
        name,
        companyId: req.user.companyId
    });

    req.session.flash_message('Area added');
    res.redirect_with_session('/settings/workflow/');
});

router.post('/workflow/areas/update/', async (req, res) => {
    const db = req.app.get('db_model');
    const id = req.body.id;
    const name = validator.trim(req.body.name);

    await db.Area.update({ name }, {
        where: { id, companyId: req.user.companyId }
    });

    req.session.flash_message('Area updated');
    res.redirect_with_session('/settings/workflow/');
});

router.post('/workflow/areas/delete/', async (req, res) => {
    const db = req.app.get('db_model');
    const id = req.body.id;

    await db.Area.destroy({
        where: { id, companyId: req.user.companyId }
    });

    req.session.flash_message('Area deleted');
    res.redirect_with_session('/settings/workflow/');
});

// Teams
router.post('/workflow/teams/add/', async (req, res) => {
    const db = req.app.get('db_model');
    const name = validator.trim(req.body.name);

    await db.Team.create({
        name,
        companyId: req.user.companyId
    });

    req.session.flash_message('Team added');
    res.redirect_with_session('/settings/workflow/');
});

router.post('/workflow/teams/update/', async (req, res) => {
    const db = req.app.get('db_model');
    const id = req.body.id;
    const name = validator.trim(req.body.name);

    await db.Team.update({ name }, {
        where: { id, companyId: req.user.companyId }
    });

    req.session.flash_message('Team updated');
    res.redirect_with_session('/settings/workflow/');
});

router.post('/workflow/teams/delete/', async (req, res) => {
    const db = req.app.get('db_model');
    const id = req.body.id;

    await db.Team.destroy({
        where: { id, companyId: req.user.companyId }
    });

    req.session.flash_message('Team deleted');
    res.redirect_with_session('/settings/workflow/');
});

// Projects
router.post('/workflow/projects/add/', async (req, res) => {
    const db = req.app.get('db_model');
    const name = validator.trim(req.body.name);
    const type = req.body.type || 'Project';

    await db.Project.create({
        name,
        type,
        companyId: req.user.companyId
    });

    req.session.flash_message('Project added');
    res.redirect_with_session('/settings/workflow/');
});

router.post('/workflow/projects/update/', async (req, res) => {
    const db = req.app.get('db_model');
    const id = req.body.id;
    const name = validator.trim(req.body.name);
    const type = req.body.type || 'Project';

    await db.Project.update({ name, type }, {
        where: { id, companyId: req.user.companyId }
    });

    req.session.flash_message('Project updated');
    res.redirect_with_session('/settings/workflow/');
});

router.post('/workflow/projects/delete/', async (req, res) => {
    const db = req.app.get('db_model');
    const id = req.body.id;

    await db.Project.destroy({
        where: { id, companyId: req.user.companyId }
    });

    req.session.flash_message('Project deleted');
    res.redirect_with_session('/settings/workflow/');
});

// Rules View
router.get('/workflow/rules/', async (req, res) => {
    const db = req.app.get('db_model');
    const companyId = req.user.companyId;
    const [rules, roles, areas] = await Promise.all([
        db.ApprovalRule.findAll({
            where: { companyId },
            include: [
                { model: db.Role, as: 'subject_role' },
                { model: db.Area, as: 'subject_area' },
                { model: db.Role, as: 'approver_role' },
            ]
        }),
        db.Role.findAll({ where: { companyId } }),
        db.Area.findAll({ where: { companyId } }),
    ]);

    // Group rules by subject role, subject area, and project type
    const grouped_rules = [];
    rules.forEach(rule => {
        const key = `${rule.subject_role_id}-${rule.subject_area_id || 'null'}-${rule.project_type}`;
        let group = grouped_rules.find(g => g.key === key);
        if (!group) {
            group = {
                key,
                subject_role: rule.subject_role,
                subject_area: rule.subject_area,
                project_type: rule.project_type,
                approvals: []
            };
            grouped_rules.push(group);
        }
        group.approvals.push({
            id: rule.id,
            approver_role: rule.approver_role,
            approver_area_constraint: rule.approver_area_constraint,
            team_scope_required: rule.team_scope_required,
            sequence_order: rule.sequence_order
        });
    });

    // Sort approvals within groups by sequence_order
    grouped_rules.forEach(g => {
        g.approvals.sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0));
    });

    res.render('settings_workflow_rules', {
        grouped_rules, roles, areas,
        title: 'Approval Rules'
    });
});

router.post('/workflow/rules/add/', async (req, res) => {
    const db = req.app.get('db_model');
    await db.ApprovalRule.create({
        companyId: req.user.companyId,
        project_type: req.body.project_type,
        subject_role_id: req.body.subject_role_id,
        subject_area_id: req.body.subject_area_id || null,
        approver_role_id: req.body.approver_role_id,
        approver_area_constraint: req.body.approver_area_constraint || null,
        team_scope_required: !!req.body.team_scope_required,
        sequence_order: req.body.sequence_order || 1
    });
    req.session.flash_message('Rule added');
    res.redirect_with_session('/settings/workflow/rules/');
});

router.post('/workflow/rules/update/', async (req, res) => {
    const db = req.app.get('db_model');
    const id = req.body.id;

    await db.ApprovalRule.update({
        project_type: req.body.project_type,
        subject_role_id: req.body.subject_role_id,
        subject_area_id: req.body.subject_area_id || null,
        approver_role_id: req.body.approver_role_id,
        approver_area_constraint: req.body.approver_area_constraint || null,
        team_scope_required: !!req.body.team_scope_required,
        sequence_order: req.body.sequence_order || 1
    }, {
        where: { id, companyId: req.user.companyId }
    });

    req.session.flash_message('Rule updated');
    res.redirect_with_session('/settings/workflow/rules/');
});

router.post('/workflow/rules/delete/', async (req, res) => {
    const db = req.app.get('db_model');
    const id = req.body.id;

    await db.ApprovalRule.destroy({
        where: { id, companyId: req.user.companyId }
    });

    req.session.flash_message('Rule deleted');
    res.redirect_with_session('/settings/workflow/rules/');
});

// Watchers View
router.get('/workflow/watchers/', async (req, res) => {
    const db = req.app.get('db_model');
    const companyId = req.user.companyId;

    const [rules, roles, teams, projects] = await Promise.all([
        db.WatcherRule.findAll({
            where: { companyId },
            include: [
                { model: db.Role, as: 'role' },
                { model: db.Team, as: 'team' },
                { model: db.Project, as: 'project' },
            ]
        }),
        db.Role.findAll({ where: { companyId } }),
        db.Team.findAll({ where: { companyId } }),
        db.Project.findAll({ where: { companyId } }),
    ]);

    res.render('settings_workflow_watchers', {
        rules, roles, teams, projects,
        title: 'Watcher Rules'
    });
});

router.post('/workflow/watchers/add/', async (req, res) => {
    const db = req.app.get('db_model');
    await db.WatcherRule.create({
        companyId: req.user.companyId,
        project_type: req.body.project_type,
        contract_type: req.body.contract_type || null,
        role_id: req.body.role_id || null,
        team_id: req.body.team_id || null,
        project_id: req.body.project_id || null,
        team_scope_required: !!req.body.team_scope_required,
    });
    req.session.flash_message('Watcher rule added');
    res.redirect_with_session('/settings/workflow/watchers/');
});

module.exports = router;
