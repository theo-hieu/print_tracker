
CREATE TABLE Users (
    UserID INT PRIMARY KEY AUTO_INCREMENT,
    UserName VARCHAR(255) NOT NULL,
    Email VARCHAR(255) UNIQUE NOT NULL,
    PasswordHash VARCHAR(255) NOT NULL
);


CREATE TABLE Materials (
    MaterialID INT PRIMARY KEY AUTO_INCREMENT,
    MaterialName VARCHAR(255) NOT NULL
);


CREATE TABLE Models (
    ModelID INT PRIMARY KEY AUTO_INCREMENT,
    ModelName VARCHAR(255) NOT NULL,
    EstimatedCost DECIMAL(10, 2),
    STLFilePath VARCHAR(255)
);


CREATE TABLE Jobs (
    JobID INT PRIMARY KEY AUTO_INCREMENT,
    JobName VARCHAR(255) NOT NULL,
    UserID INT NOT NULL,
    ModelID INT NOT NULL,
    PrintDate DATE NOT NULL,
    FOREIGN KEY (UserID) REFERENCES Users(UserID),
    FOREIGN KEY (ModelID) REFERENCES Models(ModelID)
);


CREATE TABLE JobMaterials (
    JobID INT NOT NULL,
    MaterialID INT NOT NULL,
    MaterialUsageGrams DECIMAL(10, 2) NOT NULL,

    PRIMARY KEY (JobID, MaterialID),
    FOREIGN KEY (JobID) REFERENCES Jobs(JobID),
    FOREIGN KEY (MaterialID) REFERENCES Materials(MaterialID)
);

INSERT INTO Materials (MaterialName) VALUES
('Vero Clear'),
('Vero White'),
('Vero Magenta'),
('Vero Black'),
('Agilus30 Black'),
('Agilus30 White'),
('Agilus30 Magenta'),
('Agilus30 Blue'),
('Agilus30 Yellow'),
('Agilus30 Red'),
('TissueMatrix');

