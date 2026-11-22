
CREATE TABLE Users (
    username varchar(255) PRIMARY KEY
);

CREATE TABLE Proofs (
    proposition varchar(255) PRIMARY KEY,
    result varchar(8192) CHARACTER SET utf8 COLLATE utf8_unicode_ci,
    creator varchar(255) REFERENCES Users
);