//Got back bjAPI response result 

var updateArray =
  [
    {
      "attributeId": 1,
      "attributeName": "ExpectedSalary",
      "attributeType": "SingleValue",
      "dataType": "Number",
      "classification": "Profile",
      "value": 12000
    },
    {
      "attributeId": 4,
      "attributeName": "Gender",
      "attributeType": "SingleValue",
      "dataType": "Default",
      "classification": "Profile",
      "value": { "value": "Male", "id": 1, "answerOptionId": 4346 }
    },
    {
      "attributeId": 260,
      "attributeName": "JobCategory",
      "attributeType": "MultiValue",
      "dataType": "Default",
      "classification": "JobPreference",
      "value": [{ "value": "DRIVER", "id": 0, "has": true, "answerOptionId": 6051 }]
    },
    //exact address
    {
      "attributeId": 2,
      "attributeName": "Location",
      "attributeType": "SingleValue",
      "dataType": "Address",
      "classification": "Profile",
      "value":
      {
        "isVerified": false,
        "formatted_address": "",
        "landmark": "",
        "location": { "longitude": 76.938379, "latitude": 10.9435131 },
        "postal_code": "560001",
        "country": "India",
        "locality": "Bangalore",
        "confidence": 100
      }
    },
    //city level address
    {
      "attributeId": 2,
      "attributeName": "Location",
      "attributeType": "SingleValue",
      "dataType": "Address",
      "classification": "Profile",
      "value":
      {
        "locality": "Bangalore"
      }
    }
  ];

var educationValues =
  {
    "attributeId": 261,
    "attributeName": "Qualification",
    "classification": "Qualification",
    "dataType": "Qualification",
    "attributeType": "SingleValue",
    "options": [
      { "id": 0, "answerOptionId": 6071, "name": "Never been to School", "duration": 0 },
      { "id": 1, "answerOptionId": 6072, "name": "Less than 5th standard", "duration": 0 },
      { "id": 5, "answerOptionId": 6073, "name": "5th standard", "duration": 0 },
      { "id": 8, "answerOptionId": 6074, "name": "8th standard", "duration": 0 },
      { "id": 10, "answerOptionId": 6075, "name": "10th standard", "duration": 0 },
      { "id": 12, "answerOptionId": 6076, "name": "12th standard", "duration": 0 },
      { "id": 14, "answerOptionId": 6077, "name": "Diploma", "duration": 0 },
      { "id": 16, "answerOptionId": 6078, "name": "Bachelors", "duration": 0 },
      { "id": 18, "answerOptionId": 6079, "name": "Masters", "duration": 0 },
      { "id": 19, "answerOptionId": 6080, "name": "PHD", "duration": 0 }
    ]
  };


function saveAttributeToBJ(attribute, session)
{
  var value = getProfileAttribute(attribute, session);
  var putData = 
}  

  

var coreValue = [
    { attributeType: 'MultiValue',
       attributeId: 260,
       value: [
        { value: 'DRIVER', id: 0, has: true, answerOptionId: 6051 }],
       attributeName: 'JobCategory',
       dataType: 'Default',
       classification: 'JobPreference'
   } , 
   

//Languages
     { attributeType: 'MultiValue',
       attributeId: 133,
       value:
        [ { code: 'en',
            name: 'English',
            id: 3,
            has: true,
            answerOptionId: 5866 },
          { code: 'None',
            name: 'Tamil',
            id: 12,
            has: true,
            answerOptionId: 5869
         }], 
       //Get other Langs...
       attributeName: 'SpokenLanguages',
       dataType: 'Language',
       classification: 'Profile' },

  //Gender
  {
    attributeType: 'SingleValue',
       attributeId: 4,
       value: { value: 'Male', id: 1, answerOptionId: 4346 },
       attributeName: 'Gender',
       dataType: 'Default',
       classification: 'Profile'
  },


//City
     { attributeType: 'SingleValue',
       attributeId: 2,
       value:
        { isVerified: false,
          formatted_address: 'R-38,R Block,  Kovaipudhur,  coimbatore ',
          landmark: '',
          location: { longitude: 76.938379, latitude: 10.9435131 },
          postal_code: '641042',
          country: 'India',
          locality: 'Coimbatore',
          confidence: 100 },
       attributeName: 'Location',
       dataType: 'Address',
       classification: 'Profile' },


//Picture
 { attributeType: 'SingleValue',
       attributeId: 5,
       value:
        { name: 'ProfilePic',
          has: true,
          uploaded: 'services/getimage.aspx?id=919165' },
       attributeName: 'ProfilePic',
       dataType: 'Document',
       classification: 'Profile' },

//Salary
  	{	"attributeId":1,
		"attributeName":"ExpectedSalary",
		"attributeType":"SingleValue",
		"dataType":"Number",
		"classification":"Profile",
		"value":12000
	},

]

var cityDefaults = {
  "Bangalore":
  {
    isVerified: false,
    formatted_address: '',
    landmark: '',
    location: { longitude: 76.938379, latitude: 10.9435131 },
    postal_code: '560001',
    country: 'India',
    locality: 'Bangalore',
    confidence: 100
  },
  "Delhi":
  {
    isVerified: false,
    formatted_address: '',
    landmark: '',
    location: { longitude: 76.938379, latitude: 10.9435131 },
    postal_code: '100001',
    country: 'India',
    locality: 'Delhi',
    confidence: 100
  },
  "Mumbai":
  {
    isVerified: false,
    formatted_address: '',
    landmark: '',
    location: { longitude: 76.938379, latitude: 10.9435131 },
    postal_code: '600001',
    country: 'India',
    locality: 'Mumbai',
    confidence: 100
  },
  "Chennai":
  {
    isVerified: false,
    formatted_address: '',
    landmark: '',
    location: { longitude: 76.938379, latitude: 10.9435131 },
    postal_code: '600001',
    country: 'India',
    locality: 'Chennai',
    confidence: 100
  }
};




var random = {
  profile:
   [ { attributeType: 'SingleValue',
       attributeId: 3,
       value: '1993-06-30T00:00:00.000Z',
       attributeName: 'Age',
       dataType: 'Date',
       classification: 'Profile' },
     { attributeType: 'SingleValue',
       attributeId: 4,
       value: { value: 'Male', id: 1, answerOptionId: 4346 },
       attributeName: 'Gender',
       dataType: 'Default',
       classification: 'Profile' },
     { attributeType: 'SingleValue',
       attributeId: 5,
       value:
        { name: 'ProfilePic',
          has: true,
          uploaded: 'services/getimage.aspx?id=919165' },
       attributeName: 'ProfilePic',
       dataType: 'Document',
       classification: 'Profile' },
     { attributeType: 'SingleValue',
       attributeId: 2,
       value:
        { isVerified: false,
          formatted_address: 'R-38,R Block,  Kovaipudhur,  coimbatore ',
          landmark: '',
          location: { longitude: 76.938379, latitude: 10.9435131 },
          postal_code: '641042',
          country: 'India',
          locality: 'Coimbatore',
          confidence: 100 },
       attributeName: 'Location',
       dataType: 'Address',
       classification: 'Profile' },
     { attributeType: 'MultiValue',
       attributeId: 133,
       value:
        [ { code: 'en',
            name: 'English',
            id: 3,
            has: true,
            answerOptionId: 5866 },
          { code: 'None',
            name: 'Tamil',
            id: 12,
            has: true,
            answerOptionId: 5869 } ],
       attributeName: 'SpokenLanguages',
       dataType: 'Language',
       classification: 'Profile' },
     { attributeType: 'SingleValue',
       attributeId: 21,
       value: { value: 'No', id: 2, answerOptionId: 4493 },
       attributeName: 'HasReferrals',
       dataType: 'Default',
       classification: 'Profile' } ],
  documents:
   [ { attributeType: 'MultiValue',
       attributeId: 105,
       value:
        [ { name: 'Yellow badge', id: 1, has: true, answerOptionId: 5746 },
          { name: 'HMV licence', id: 4, has: true, answerOptionId: 5749 },
          { name: 'Commercial driving licence',
            id: 7,
            has: true,
            answerOptionId: 5752 } ],
       attributeName: 'DriverLicences',
       dataType: 'Document',
       classification: 'Document' },
     { attributeType: 'MultiValue',
       attributeId: 122,
       value: [
         { name: 'DrivingLicense', id: 3, has: true, answerOptionId: 5817 }],
       attributeName: 'IDProofs',
       dataType: 'Document',
       classification: 'Document'
    }
  ],
  modifiedOn: '2015-01-31T10:10:19.087Z',
  assets:
   [ { attributeType: 'MultiValue',
       attributeId: 73,
       value:
        [ { name: 'Other 4 wheeler',
            id: 2,
            has: true,
            answerOptionId: 5611 },
          { name: 'Car', id: 4, has: true, answerOptionId: 6001 } ],
       attributeName: 'VehicleOwnership',
       dataType: 'Asset',
       classification: 'Asset' } ],
  skills:
   [ { attributeType: 'MultiValue',
       attributeId: 72,
       value: [ { name: 'manual', id: 2, has: true, answerOptionId: 5608 } ],
       attributeName: 'TransmissionType',
       dataType: 'Skill',
       classification: 'Skill' },
     { attributeType: 'MultiValue',
       attributeId: 102,
       value:
        [ { value: 'Read SMS', id: 1, has: true, answerOptionId: 5736 },
          { value: 'Basic Smartphone usage',
            id: 3,
            has: true,
            answerOptionId: 5738 } ],
       attributeName: 'SmartPhoneSkills',
       dataType: 'Default',
       classification: 'Skill' },
     { attributeType: 'SingleValue',
       attributeId: 19,
       value: { value: 'None', id: 0, answerOptionId: 4485 },
       attributeName: 'HindiAtPrevJob',
       dataType: 'FixedRange',
       classification: 'Skill' },
     { attributeType: 'SingleValue',
       attributeId: 167,
       value: { value: 'Yes', id: 1, answerOptionId: 4469 },
       attributeName: 'DriverOwnerOperator',
       dataType: 'Default',
       classification: 'Skill' },
     { attributeType: 'MultiValue',
       attributeId: 22,
       value: [ { name: '4 wheeler/Car', id: 3, has: true, answerOptionId: 4499 } ],
       attributeName: 'CanDriveVehicleType',
       dataType: 'Skill',
       classification: 'Skill' } ],
  createdOn: '2015-01-31T10:10:05.213Z',
  qualifications:
   [ { attributeType: 'SingleValue',
       attributeId: 261,
       value: { id: 16, institution: '', description: 'BCA', name: 'Bachelors' },
       attributeName: 'Qualification',
       dataType: 'Qualification',
       classification: 'Qualification' } ],
  experience:
   [ { attributeType: 'SingleValue',
       attributeId: 17,
       value: { value: 'No', id: 2, answerOptionId: 4458 },
       attributeName: 'InterstateDriver',
       dataType: 'Default',
       classification: 'Experience' } ],
  others: [],
  jobPreferences:
   [ { attributeType: 'MultiValue',
       attributeId: 260,
       value: [ { value: 'DRIVER', id: 0, has: true, answerOptionId: 6051 } ],
       attributeName: 'JobCategory',
       dataType: 'Default',
       classification: 'JobPreference' },
     { attributeType: 'MultiValue',
       attributeId: 129,
       value: [ { value: 'Night', id: 2, has: true, answerOptionId: 5854 } ],
       attributeName: 'JobShift',
       dataType: 'Default',
       classification: 'JobPreference' },
     { attributeType: 'MultiValue',
       attributeId: 109,
       value: [ { value: '12 hours', id: 2, has: true, answerOptionId: 5767 } ],
       attributeName: 'DrivingShifts',
       dataType: 'Default',
       classification: 'JobPreference' },
     { attributeType: 'SingleValue',
       attributeId: 18,
       value: { value: 'Yes', id: 1, answerOptionId: 4477 },
       attributeName: 'OutstationTravel',
       dataType: 'Default',
       classification: 'JobPreference' } ],
  status: 0,
  assessments:
  [
  ],

  user:
  {
    aboutMe: 'I am a BCA graduate',
     userID: 3179019,
     dateOfBirth: '1900-01-01T00:00:00.000Z',
     lastSignIn: '2015-01-31T10:10:19.087Z',
     isDeleted: false,
     role: 2,
     contactDetails:
      [ { isVerified: true, value: '+917373052612', contactType: 2 },
        { isVerified: false,
          value: 'ppraveen.arasu@gmail.com',
          contactType: 4 } ],
     name: { lastName: 'P', firstName: 'Praveenkumar' } },
  jobSeekerId: '57d5519fb4490e70c3c2e0b0' }
