const mongoose = require('mongoose');

const admissionSchema = mongoose.Schema({


    student_photo: {

        type: String
    },

    student_name: {

        type: String
    },

    dob: {

        type: String
    },

    gender: {

        type: String
    },

    student_adhaar_no: {

        type: String
    },

    father_name: {

        type: String
    },

    father_adhaar_no: {

        type: String
    },

    occupation: {

        type: String
    },

    relation_with_student: {

        type: String
    },

    mobile_no: {

        type: String
    },

    mother_name: {

        type: String
    },

    total_family_member: {

        type: String
    },

    family_monthly_income: {

        type: Number
    },

    present_school_details: {

        type: String
    },

    present_class: {

        type: String
    },

    appling_for_class: {

        type: String
    },

    full_address: {

        type: String
    },

    appling_date: {

        type: String
    },

    residential_status: {

        type: String
    },

    form_no: {

        type: String
    }

});

const student_admission_model = mongoose.model('student_admission_model', admissionSchema);

module.exports = student_admission_model;