import mysql.connector
from mysql.connector import Error

class Database:
    def __init__(self, username, password):
        self.database = None
        self._username = username
        self._password = password
    
    def connect(self, username: str, password: str):
        try:
            self.database = mysql.connector.connect(
                host='gateway01.us-west-2.prod.aws.tidbcloud.com',
                port=4000,
                user=username,
                password=password,
                database='TheProofIsTrivial',
                autocommit=True,
                use_pure=True,
                ssl_verify_cert=True,
                ssl_verify_identity=True,
                ssl_ca='/etc/ssl/certs/ca-certificates.crt'
            )
        
        except Error as e:
            raise Exception(e)


    def disconnect(self):
        if self.database is None:
            raise Exception ("Error in disconnectFromDatabase: Database is None type")
    
        if(self.database.is_connected() == False):
            raise Exception ("Error in disconnectFromDatabase: Database was not connected")
    
        self.database.close()
        self.database = None
    
        return True
    
    
    def _retrieve(self, query, params):
        output = None
        try:
            if self.database == None:
                self.connect(self._username, self._password)
                
            cursor = self.database.cursor(dictionary = True)
            cursor.execute(query, params)
            output = cursor.fetchall()
        
        except Error as e:
            print("Error: ", e)
            
        finally:
            cursor.close()
            self.disconnect()
        
        return output

    
    def _update(self, query, params):
        output = False
        try:
            if self.database == None:
                self.connect(self._username, self._password)
                
            cursor = self.database.cursor()
            cursor.execute(query, params)
            self.database.commit()
            output = True
        
        except Error as e:
            print("Error: ", e)
        
        finally:
            cursor.close()
            self.disconnect()
    
        return output
    
    def retrieveProof(self, input):
        query = "SELECT * FROM Proofs WHERE proposition = %(proposition)s;"
        return self._retrieve(query, input)
    
    def retrieveProofs(self, input):
        query = "SELECT * FROM Proofs WHERE creator = %(username)s;"
        return self._retrieve(query, input)

    def addUser(self, input):
        query = "INSERT INTO Users (username) VALUES (%(username)s);"
        return self._update(query, input)
    
    def addProof(self, input):
        query = "INSERT INTO Proofs (proposition, result, creator) VALUES (%(proposition)s, %(result)s, %(creator)s);"
        return self._update(query, input)

    def deleteUser(self, input):
        query = "DELETE FROM Users WHERE username = %(username)s;"
        return self._update(query, input)
    
    def deleteProof(self, input):
        query = "DELETE FROM Proofs WHERE proposition = %(proposition)s;"
        return self._update(query, input)
    
    def getUser(self, input):
        query = "SELECT COUNT(*) as Count FROM Users WHERE username = %(username)s;"
        return self._retrieve(query, input)
