# === Function: Database table creator ===
def db_table_creator(yhteys):
    sql = f"""
        CREATE TABLE IF NOT EXISTS results (
            ID INT NOT NULL AUTO_INCREMENT,
            name VARCHAR(40),
            levels INT,
            cities INT,
            km_amount FLOAT,
            co2_amount FLOAT,
            PRIMARY KEY (ID)
        );
    """
    cursor = yhteys.cursor()  # yhteys is a connection function
    cursor.execute(sql)
    yhteys.commit()   # save changes
    return

# === Function: Fill the database table 'results' ===
def results_to_db(yhteys, name, level, city, km, co2):
    sql = f"""
        INSERT INTO results (name, levels, cities, km_amount, co2_amount)
        VALUES (%s, %s, %s, %s, %s);
    """
    cursor = yhteys.cursor()  # yhteys is a connection function
    cursor.execute(sql, (name, level, city, km, co2))
    yhteys.commit()   # save changes
    return
