from db import get_connection

yhteys = get_connection()

# === Database table creator ===
def db_table_creator():
    sql = f"""
        CREATE TABLE IF NOT EXISTS results (
            ID INT NOT NULL AUTO_INCREMENT,
            name VARCHAR(40),
            date VARCHAR(40),
            levels INT,
            cities INT,
            km_amount FLOAT,
            co2_amount FLOAT,
            status VARCHAR(40),
            PRIMARY KEY (ID)
        );
    """
    cursor = yhteys.cursor() 
    cursor.execute(sql)
    yhteys.commit()   
    return

# === Fill the database table 'results' ===
def results_to_db(name, date, level, city, km, co2, status):
    sql = f"""
        INSERT INTO results (name, date, levels, cities, km_amount, co2_amount, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s);
    """
    try:
        cursor = yhteys.cursor()
        cursor.execute(sql, (name, date, level, city, km, co2, status))
        yhteys.commit()
        return True
    except Exception as e:
        print("Mistake:", e)
        return False
