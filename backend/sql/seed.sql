USE printing_db;

INSERT INTO Users (UserName, Email, PasswordHash) VALUES
('TestUser', 'test@example.com', '$2b$10$YourHashHere');

INSERT INTO Printers (PrinterName) VALUES
('Prusa'),('FormLabs'),('Stratasys');

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
