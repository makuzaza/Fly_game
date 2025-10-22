from db import get_connection

yhteys = get_connection()

def db_table_creator():
    sql = f"""
        CREATE TABLE IF NOT EXISTS results (
            ID INT NOT NULL AUTO_INCREMENT,
            name VARCHAR(40),
            date VARCHAR(40),
            levels INT,
            flights INT,
            km_amount FLOAT,
            co2_amount FLOAT,
            status VARCHAR(40),
            co2_percent FLOAT,
            PRIMARY KEY (ID)
        );
    """
    cursor = yhteys.cursor() 
    cursor.execute(sql)
    yhteys.commit() 
    return

def results_to_db(name, date, level, flights, km, co2, status, co2_percent):
    sql = f"""
        INSERT INTO results (name, date, levels, flights, km_amount, co2_amount, status, co2_percent)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
    """
    try:
        cursor = yhteys.cursor()
        cursor.execute(sql, (name, date, level, flights, km, co2, status, co2_percent))
        yhteys.commit()
        return True
    except Exception as e:
        print("Mistake:", e)
        return False
        