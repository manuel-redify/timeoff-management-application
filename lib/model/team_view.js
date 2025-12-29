
'use strict';

const
  moment = require('moment'),
  Promise = require('bluebird'),
  Joi = require('joi'),
  Exception = require('../error'),
  _ = require('underscore');
const { sorter } = require('../util');

function TeamView(args) {
  var me = this;

  this.user = args.user;
  this.base_date = args.base_date || this.user.company.get_today();

  // Optional parameters that override base date specify months range
  // Team view is going to represent.
  //
  // The precision is up to month, that is any smaller part of dates
  // (such as days, hours etc) are ignored.
  //
  // If those two parameters are missed - base_date is used to determine with month
  // Team view would represent.
  //
  this.start_date = args.start_date;
  this.end_date = args.end_date;

  if (args.start_date && args.end_date && args.base_date) {
    Exception.throw_user_error({
      user_error: 'Failed to calculate team view',
      system_error: 'TeamView could not be instanciated with start_date, end_data and base_date all defined.'
    });
  }
}

TeamView.prototype.promise_team_view_details = function (args) {

  // Handle case when no parameters were provided
  if (!args) {
    args = {};
  }

  let
    self = this,
    user = this.user,
    current_department_id = args.department_id, // optional parameter
    related_departments = [],
    current_department,
    base_date = this.base_date;

  var promise_departments;

  var normalise_departments_func = function (my_department, supervised_departments) {

    if (my_department) {
      // Get all related departments by combining supervised ones with
      // one current user belongs to
      supervised_departments.push(my_department);
    }
    supervised_departments = _.uniq(
      supervised_departments.filter(Boolean),
      function (item) { return item.id }
    );

    // Copy all available departments for current user into closured variable
    // to pass it into template
    related_departments = supervised_departments.sort((a, b) => sorter(a.name, b.name))

    // Find out what particular department is active now
    if (current_department_id) {
      current_department = _.findWhere(supervised_departments, { id: Number(current_department_id) });
    }

    return Promise.resolve(current_department ? [current_department] : supervised_departments);
  }

  if (user.is_admin() || user.company.share_all_absences) {

    // For admin users or if current company allows all users to see everybody's
    // time offs promise all departments for current company
    promise_departments = user.company.getDepartments()
      .then(function (departments) {
        return normalise_departments_func(null, departments);
      });

  } else {
    // Promise departments either supervised by current user or one that she belongs to
    promise_departments = Promise.join(
      user.getDepartment(),
      user.promise_supervised_departments(),
      normalise_departments_func
    );
  }

  // Calculate users and leaves for every department
  var promise_users_and_leaves = promise_departments
    .map(department => self.start_date && self.end_date
      ? department.promise_team_view_for_months_range(self.start_date, self.end_date)
      : department.promise_team_view_for_month(base_date)
    );

  // If we are showing all departments (admin/shared view) and not filtering by specific department,
  // also fetch users with NO department.
  if ((user.is_admin() || user.company.share_all_absences) && !current_department_id) {
    promise_users_and_leaves = Promise.join(
      promise_users_and_leaves,
      self.promise_users_with_no_department(),
      (results, orphans) => {
        results.push(orphans);
        return results;
      }
    );
  }

  return promise_users_and_leaves.then(users_and_leaves => {

    users_and_leaves = users_and_leaves
      .flat(Infinity)
      .sort((a, b) => sorter(
        (a.user.name || '') + (a.user.lastname || ''),
        (b.user.name || '') + (b.user.lastname || '')
      ));

    return Promise.resolve({
      users_and_leaves: users_and_leaves,
      related_departments: related_departments,
      current_department: current_department,
    });
  });

};

TeamView.prototype.promise_users_with_no_department = function () {
  const self = this;
  const user = self.user;
  const start_date = self.start_date || self.base_date;
  const end_date = self.end_date || self.base_date;
  const company = user.company;
  const CalendarMonth = require('./calendar_month');

  return user.sequelize.models.User.findAll({
    where: {
      companyId: user.companyId,
      DepartmentId: null,
      $or: [
        { end_date: { $eq: null } },
        { end_date: { $gte: moment.utc(start_date).format('YYYY-MM-DD') } },
      ]
    },
    include: [{ model: user.sequelize.models.Company, as: 'company' }]
  })
    .then(users => {
      return Promise.map(users, user => {
        return user.promise_my_leaves_for_calendar({ year: start_date })
          .then(leaves => {
            const leave_days = _.flatten(leaves.map(leave => {
              return leave.get_days().map(leave_day => {
                leave_day.leave = leave;
                return leave_day;
              });
            }));
            return user.promise_schedule_I_obey()
              .then(schedule => ({ user, leave_days, schedule }));
          });
      });
    })
    .then(users_data => {
      // Calculate calendar months (borrowed logic from Department model)
      const number_of_months = moment.utc(end_date).month() - moment.utc(start_date).month();

      users_data.forEach(user_data => {
        user_data.days = [];
        for (let i = 0; i <= number_of_months; i++) {
          const calendar_month = new CalendarMonth(
            moment.utc(start_date).clone().add(i, 'months'),
            {
              bank_holidays: [], // No department, so no public holidays? Or defaulting to company? Assuming none for consistency with existing logic.
              leave_days: user_data.leave_days,
              schedule: user_data.schedule,
              today: company.get_today(),
              leave_types: company.leave_types,
            }
          );
          user_data.days.push(calendar_month.as_for_team_view());
        }
        user_data.days = _.flatten(user_data.days);
      });
      return users_data;
    });
};

// Experimenting with parameter validation done with Joi.js
const inject_statistics_args_schema = Joi.object()
  .keys({
    leave_types: Joi.array().items(
      Joi.object().keys({
        id: Joi.number().required(),
        use_allowance: Joi.boolean().required(),
      })
    ),
    team_view_details: Joi.object().required().keys({
      users_and_leaves: Joi.array().required().items(
        Joi.object().keys()
      )
    }),
  });

/*
 * Takes "team view details" and enrich them with statistics about absences
 * each employee has for given month
 *
 * */

TeamView.prototype.inject_statistics = function (args) {

  // Validate parameters
  let param_validation = Joi.validate(args, inject_statistics_args_schema, { allowUnknown: true });
  if (param_validation.error) {
    console.log('An error occured when trying to validate args in inject_statistics.');
    console.dir(param_validation.error);
    throw new Error('Failed to validate parameters in TeamView.inject_statistics');
  }

  let
    team_view_details = args.team_view_details,
    leave_types = args.leave_types || [];

  // Convert leave types array into look-up map
  let leave_types_map = {};
  leave_types.forEach(lt => leave_types_map[lt.id] = lt);

  team_view_details
    .users_and_leaves
    .forEach(node => {

      let deducted_days = 0;

      // Set statistics by leave type to zeros
      let leave_type_stat = {};
      leave_types.forEach(lt => leave_type_stat[lt.id] = 0);

      node
        .days
        // Consider only those days that have any leave objects
        .filter(day => !!day.leave_obj)
        // Ignore those days which were not approved yet
        .filter(day => !!day.leave_obj.is_approved_leave())
        // Ignore weekends
        .filter(day => !day.is_weekend)
        // Ignore bank holidays
        .filter(day => !day.is_bank_holiday)
        .forEach(day => {

          if (day.is_leave_morning) {

            leave_type_stat[day.morning_leave_type_id] = leave_type_stat[day.morning_leave_type_id] + 0.5;

            if (leave_types_map[day.morning_leave_type_id] && leave_types_map[day.morning_leave_type_id].use_allowance) {
              deducted_days = deducted_days + 0.5;
            }
          }

          if (day.is_leave_afternoon) {

            if (leave_types_map[day.afternoon_leave_type_id] && leave_types_map[day.afternoon_leave_type_id].use_allowance) {
              deducted_days = deducted_days + 0.5;
            }

            leave_type_stat[day.afternoon_leave_type_id] = leave_type_stat[day.afternoon_leave_type_id] + 0.5;
          }

        });

      let statistics = {
        deducted_days: deducted_days,
        // Shows statistics by leave type
        leave_type_break_down: {
          // format for machine using
          lite_version: leave_type_stat,
          // format for rendering to end users
          pretty_version: leave_types
            // Sort by name
            .sort((a, b) => sorter(a.name, b.name))
            .map(lt => ({ name: lt.name, stat: leave_type_stat[lt.id], id: lt.id })),
        }
      };

      node.statistics = statistics;
    });

  return Promise.resolve(team_view_details);
};

/*
 *  Take "team view details" and user for whom them were generated
 *  and ensure the details contain statisticts for only those employees
 *  current user has access to.
 *
 * */

TeamView.prototype.restrainStatisticsForUser = function (args) {

  // TODO Consider parameters validation in the same fashion as in inject_statistics method

  let
    team_view_details = args.team_view_details,
    observer_user = args.user;

  let supervised_user_map = {};
  observer_user.supervised_users.forEach(u => supervised_user_map[u.id] = u);

  team_view_details
    .users_and_leaves
    .forEach(item => {
      if (item.statistics && !supervised_user_map[item.user.id]) {
        delete item.statistics;
      }
    });

  return Promise.resolve(team_view_details);
};

module.exports = TeamView;
