import os

import mysql.connector
from mysql.connector import Error

class Database:
    def __init__(self):
        self._host = os.getenv("TIDB_HOST", "gateway01.us-west-2.prod.aws.tidbcloud.com")
        self._port = int(os.getenv("TIDB_PORT", "4000"))
        self._username = os.getenv("TIDB_USER", "")
        self._password = os.getenv("TIDB_PASSWORD", "")
        self._database_name = os.getenv("TIDB_DB_NAME", "TheProofIsTrivial")
        self._ca_path = os.getenv("CA_PATH")

    def connect(self):
        if not self._username:
            raise RuntimeError("TIDB_USER is not configured.")

        connection_options = {
            "host": self._host,
            "port": self._port,
            "user": self._username,
            "password": self._password,
            "database": self._database_name,
            "autocommit": True,
            "use_pure": True,
            "ssl_verify_cert": True,
            "ssl_verify_identity": True,
        }
        if self._ca_path:
            connection_options["ssl_ca"] = self._ca_path

        try:
            return mysql.connector.connect(**connection_options)
        except Error as e:
            raise RuntimeError("Could not connect to TiDB.") from e

    def check_connection(self):
        try:
            with self.connect() as connection:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
                    cursor.fetchone()
        except Error as e:
            raise RuntimeError("TiDB health check failed.") from e

    def _retrieve(self, query, params):
        try:
            with self.connect() as connection:
                with connection.cursor(dictionary=True) as cursor:
                    cursor.execute(query, params)
                    return cursor.fetchall()
        except Error as e:
            raise RuntimeError("TiDB query failed.") from e

    def _update(self, query, params):
        try:
            with self.connect() as connection:
                with connection.cursor() as cursor:
                    cursor.execute(query, params)
                    connection.commit()
                    return True
        except Error as e:
            raise RuntimeError("TiDB update failed.") from e
    
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
