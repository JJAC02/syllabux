CREATE TABLE IF NOT EXISTS Users(
	user_id 	INT 		PRIMARY KEY AUTO_INCREMENT,
	first_name 	VARCHAR(50) NOT NULL,
	last_name 	VARCHAR(50) NOT NULL,
	email		VARCHAR(255) UNIQUE NOT NULL,
	password_hash 	VARCHAR(255) NOT NULL,
	role ENUM('student', 'instructor', 'admin') NOT NULL DEFAULT 'student',	
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS PasswordResetTokens(
	token_id INT PRIMARY KEY AUTO_INCREMENT,
	user_id INT NOT NULL,
		CONSTRAINT FK_PasswordResetTokens_Users FOREIGN KEY (user_id) REFERENCES Users(user_id)
			ON DELETE RESTRICT
			ON UPDATE CASCADE,
	token_hash VARCHAR(255) UNIQUE NOT NULL,
	expires_at DATETIME NOT NULL,
	used          BOOLEAN DEFAULT FALSE,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS RememberTokens(
	token_id INT PRIMARY KEY AUTO_INCREMENT,
	user_id INT NOT NULL,
		CONSTRAINT FK_RememberTokens_Users FOREIGN KEY (user_id) REFERENCES Users(user_id)
			ON DELETE RESTRICT
			ON UPDATE CASCADE,
	token_hash VARCHAR(255) NOT NULL,
	expires_at DATETIME NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Instructors(
	instructor_id INT PRIMARY KEY AUTO_INCREMENT NOT NULL, 
	user_id INT NOT NULL UNIQUE,
		CONSTRAINT FK_Instructor_Users FOREIGN KEY (user_id) REFERENCES Users(user_id)
			ON DELETE RESTRICT
			ON UPDATE CASCADE,
	bio VARCHAR(255),
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS InstructorApplication (
  application_id    INT PRIMARY KEY AUTO_INCREMENT,
  user_id           INT UNIQUE NOT NULL,
  about_self        TEXT NOT NULL,
  linkedin_url VARCHAR(255) NULL,
  years_of_experience TINYINT UNSIGNED,
  expertise_summary TEXT,
  resume_link VARCHAR(500),
  submitted_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT FK_Application_Users FOREIGN KEY (user_id)
          REFERENCES Users(user_id)
          ON DELETE CASCADE
          ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS ApplicationDecision (
    decision_id       INT PRIMARY KEY AUTO_INCREMENT,
    application_id    INT NOT NULL UNIQUE,
    status            ENUM('pending', 'accepted', 'denied') NOT NULL DEFAULT 'pending',
    decided_by        INT NULL,
    decided_at        DATETIME NULL,
    reason            TEXT NULL,

    CONSTRAINT FK_Decision_Application FOREIGN KEY (application_id)
        REFERENCES InstructorApplication(application_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT FK_Decision_Admin FOREIGN KEY (decided_by)
        REFERENCES Users(user_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS ExpertiseTags(
	expertise_id INT PRIMARY KEY AUTO_INCREMENT,
	name VARCHAR(255) UNIQUE NOT NULL
);
-- JUNCTION TABLE
CREATE TABLE IF NOT EXISTS InstructorExpertise(
	instructor_id INT NOT NULL,
		CONSTRAINT FK_InstructorExpertise_Instructors FOREIGN KEY (instructor_id) REFERENCES Instructors(instructor_id)
			ON DELETE RESTRICT
			ON UPDATE CASCADE,
	expertise_id INT NOT NULL,
		CONSTRAINT FK_InstructorExpertise_ExpertiseTags FOREIGN KEY (expertise_id) REFERENCES ExpertiseTags(expertise_id)
			ON DELETE RESTRICT
			ON UPDATE CASCADE,
	PRIMARY KEY(instructor_id, expertise_id)
);

CREATE TABLE IF NOT EXISTS Students(
	student_id INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
	user_id INT NOT NULL UNIQUE,
		CONSTRAINT FK_Students_Users FOREIGN KEY (user_id) REFERENCES Users(user_id)
			ON DELETE RESTRICT
			ON UPDATE CASCADE,
	bio TEXT,
	avatar_url VARCHAR(255),
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Courses(
	course_id INT PRIMARY KEY AUTO_INCREMENT, 
	instructor_id INT NOT NULL,
		CONSTRAINT FK_Courses_Instructors FOREIGN KEY (instructor_id) REFERENCES Instructors(instructor_id)
			ON DELETE RESTRICT
			ON UPDATE CASCADE,
	title VARCHAR(150) NOT NULL,
	description TEXT NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS Modules(
    module_id       INT PRIMARY KEY AUTO_INCREMENT,
    course_id       INT NOT NULL,
        CONSTRAINT FK_Modules_Courses FOREIGN KEY (course_id) REFERENCES Courses(course_id)
            ON DELETE RESTRICT
            ON UPDATE CASCADE,
    title           VARCHAR(150) NOT NULL,
    description     TEXT NOT NULL,
    sequence_order  INT NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT UQ_Modules_Course_Sequence UNIQUE (course_id, sequence_order)
);

CREATE TABLE IF NOT EXISTS Assessments(
	assessment_id INT PRIMARY KEY AUTO_INCREMENT,
	course_id INT NOT NULL,
		CONSTRAINT FK_Assesments_Courses FOREIGN KEY (course_id) REFERENCES Courses(course_id)
            ON DELETE RESTRICT
            ON UPDATE CASCADE,
	title VARCHAR(255) ,
	max_score DECIMAL(6,2) NOT NULL DEFAULT 100,
	passing_percentage DECIMAL (5,2) NOT NULL DEFAULT 50,
		CONSTRAINT CHK_Assessment_Passing CHECK (passing_percentage BETWEEN 0 AND 100),
	created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS ModuleContent (
    content_id          INT PRIMARY KEY AUTO_INCREMENT,
    module_id           INT NOT NULL,
        CONSTRAINT FK_ModuleContent_Modules FOREIGN KEY (module_id) REFERENCES Modules(module_id)
            ON DELETE RESTRICT
            ON UPDATE CASCADE,
    content_type        ENUM('video', 'reading', 'quiz') NOT NULL,
    title               VARCHAR(150),
    content_url         VARCHAR(500) NOT NULL,
    video_duration_sec  INT,             
    sequence_order      INT NOT NULL,    
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Enrollments(
	enrollment_id INT PRIMARY KEY AUTO_INCREMENT,
	student_id INT NOT NULL,
		CONSTRAINT FK_Enrollments_Students FOREIGN KEY (student_id) REFERENCES Students(student_id)
			ON DELETE RESTRICT
			ON UPDATE CASCADE,
	course_id INT NOT NULL,
		CONSTRAINT FK_Enrollments_Courses FOREIGN KEY (course_id) REFERENCES Courses(course_id)
			ON DELETE RESTRICT
			ON UPDATE CASCADE,
	enrollment_date DATE NOT NULL,
	progress_percentage DECIMAL(5,2),
	status ENUM('active', 'completed', 'dropped') NOT NULL,
	completion_date DATE,

	CONSTRAINT UQ_Enrollments_Student_Course
        UNIQUE (student_id, course_id)
	CONSTRAINT CHK_Enrollments_ProgressPct CHECK (progress_percentage BETWEEN 0 AND 100),  -- FIX: new
	CONSTRAINT CHK_Enrollments_CompletionDate CHECK (
		(status = 'completed' AND completion_date IS NOT NULL)
		OR (status <> 'completed' AND completion_date IS NULL)
	)
);

CREATE TABLE IF NOT EXISTS ModuleProgress(
	progress_id INT PRIMARY KEY AUTO_INCREMENT,
	enrollment_id INT NOT NULL,
		CONSTRAINT FK_ModuleProgress_Enrollments FOREIGN KEY (enrollment_id) REFERENCES Enrollments(enrollment_id)
			ON DELETE RESTRICT
			ON UPDATE CASCADE,
	module_id INT NOT NULL,
		CONSTRAINT FK_ModuleProgress_Modules FOREIGN KEY (module_id) REFERENCES Modules(module_id)
			ON DELETE RESTRICT
			ON UPDATE CASCADE,
	is_completed BOOLEAN DEFAULT FALSE,
	completed_at DATE,
	video_watch_position INT,
	last_accessed_at DATETIME
	CONSTRAINT UQ_ModuleProgress_Enrollment_Module UNIQUE (enrollment_id, module_id)
);

CREATE TABLE IF NOT EXISTS Categories(
	category_id INT PRIMARY KEY AUTO_INCREMENT,
	name VARCHAR(100) NOT NULL UNIQUE,
	description VARCHAR(255)
); 

-- JUNCTION TABLE

CREATE TABLE IF NOT EXISTS CourseCategories (
    course_id INT NOT NULL,
    category_id INT NOT NULL,  

    CONSTRAINT FK_CourseCategories_Courses FOREIGN KEY (course_id) REFERENCES Courses(course_id)
        ON DELETE CASCADE
		ON UPDATE CASCADE,   

    CONSTRAINT FK_CourseCategories_Categories FOREIGN KEY (category_id) REFERENCES Categories(category_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    PRIMARY KEY (course_id, category_id)
);

CREATE TABLE IF NOT EXISTS Certificates (
    certificate_id INT PRIMARY KEY AUTO_INCREMENT,
    enrollment_id INT NOT NULL UNIQUE,
		CONSTRAINT FK_Certificates_Enrollments FOREIGN KEY (enrollment_id) REFERENCES Enrollments(enrollment_id)
		ON DELETE RESTRICT
		ON UPDATE CASCADE,
    issued_date DATE NOT NULL,
    certificate_url VARCHAR(255),
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
    
);

CREATE TABLE IF NOT EXISTS Reviews (
    review_id INT PRIMARY KEY AUTO_INCREMENT,
    enrollment_id INT NOT NULL UNIQUE,
    rating TINYINT CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_Reviews_Enrollments FOREIGN KEY (enrollment_id) REFERENCES Enrollments(enrollment_id)
		ON DELETE RESTRICT
		ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS AssessmentsQuestions (
	question_id INT PRIMARY KEY AUTO_INCREMENT,
	assessment_id INT NOT NULL,
	CONSTRAINT FK_AssessQuestions_Assessment FOREIGN KEY (assessment_id) REFERENCES Assessments (assessment_id)
		ON DELETE CASCADE
		ON UPDATE CASCADE,
	question TEXT NOT NULL,
	question_type ENUM('choice','text') NOT NULL,
	correct_answer VARCHAR(255) NOT NULL,
	sequence_order INT NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT CHK_AssessQuestions_TextAnswer CHECK (
		(question_type = 'text' AND correct_answer_text IS NOT NULL)
		OR (question_type = 'choice' AND correct_answer_text IS NULL)
	)
);

CREATE TABLE IF NOT EXISTS QuestionChoices (
	choice_id INT PRIMARY KEY AUTO_INCREMENT,
	question_id INT NOT NULL,
		CONSTRAINT FK_QuestionChoices_Questions FOREIGN KEY (question_id) REFERENCES AssessmentsQuestions(question_id)
			ON DELETE CASCADE
			ON UPDATE CASCADE,
	choice_text VARCHAR(255) NOT NULL,
	is_correct BOOLEAN NOT NULL DEFAULT FALSE,
	sequence_order INT NOT NULL,
	CONSTRAINT UQ_QuestionChoices_Question_Sequence UNIQUE (question_id, sequence_order)
);
 
CREATE TABLE IF NOT EXISTS AssessmentAttempts (
	attempt_id INT PRIMARY KEY AUTO_INCREMENT,
	assessment_id INT NOT NULL,
		CONSTRAINT FK_AssessmemtAttempts_Assessments FOREIGN KEY (assessment_id) REFERENCES Assessments (assessment_id)
			ON DELETE RESTRICT
			ON UPDATE CASCADE,
	student_id INT NOT NULL,
		CONSTRAINT FK_AssessmemtAttempts_Students FOREIGN KEY (student_id) REFERENCES Students (student_id)
			ON DELETE RESTRICT
			ON UPDATE CASCADE,
	attempt_score DECIMAL(6,2) NOT NULL,
	passed BOOLEAN NOT NULL DEFAULT FALSE,
	attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS StudentAnswers (
	answer_id           INT PRIMARY KEY AUTO_INCREMENT,
	attempt_id           INT NOT NULL,
		CONSTRAINT FK_StudentAnswers_Attempts FOREIGN KEY (attempt_id) REFERENCES AssessmentAttempts(attempt_id)
			ON DELETE CASCADE
			ON UPDATE CASCADE,
	question_id          INT NOT NULL,
		CONSTRAINT FK_StudentAnswers_Questions FOREIGN KEY (question_id) REFERENCES AssessmentsQuestions(question_id)
			ON DELETE RESTRICT
			ON UPDATE CASCADE,
	selected_choice_id   INT NULL,                         
		CONSTRAINT FK_StudentAnswers_Choices FOREIGN KEY (selected_choice_id) REFERENCES QuestionChoices(choice_id)
			ON DELETE RESTRICT
			ON UPDATE CASCADE,
	answer_text          VARCHAR(255) NULL,               
	is_correct           BOOLEAN NOT NULL DEFAULT FALSE,
	answered_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT UQ_StudentAnswers_Attempt_Question UNIQUE (attempt_id, question_id),
	CONSTRAINT CHK_StudentAnswers_OneAnswerType CHECK (
		(selected_choice_id IS NOT NULL AND answer_text IS NULL)
		OR (selected_choice_id IS NULL AND answer_text IS NOT NULL)
	)
);
 
CREATE TABLE IF NOT EXISTS CertificatesAssessmentsAttempts (
	certificate_id INT NOT NULL,
	attempt_id     INT NOT NULL,
	CONSTRAINT PK_CertificateAssessmentAttempts PRIMARY KEY (certificate_id, attempt_id),
	CONSTRAINT FK_CertAttempt_Certificates FOREIGN KEY (certificate_id) REFERENCES Certificates(certificate_id)
		ON DELETE RESTRICT
		ON UPDATE CASCADE,
	CONSTRAINT FK_CertAttempt_Attempts FOREIGN KEY (attempt_id) REFERENCES AssessmentAttempts(attempt_id)
		ON DELETE RESTRICT
		ON UPDATE CASCADE
);
