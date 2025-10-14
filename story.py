import textwrap
# edit the story to set correct lines
story = '''
Hello, my friend! 
Welcome to the exciting world of global travel! In this game, you will embark on flights to distant countries, solve intriguing puzzles, and experience unforgettable adventures. Of course, it is important to keep the environment in mind — so plan your route carefully to reduce CO₂ emissions. You’ll start Level 1 from Helsinki, and always progress from previous destination. Your task is to visit 3 countries by guessing their names. Don’t worry—plenty of hints will guide you along the way. We recommend using the map to choose the most optimal route. Each country may have several airports, so choose wisely, always considering the environmental impact. If you don’t succeed, each level can be replayed up to 3 times. You can also exit the game at any time by typing “quit” or “X” on your keyboard. At the end of the game, you’ll see your results, which will also be automatically saved to the database for future viewing. 
Good luck! 🌍✈️
'''

# Set column width to 100 characters
wrapper = textwrap.TextWrapper(width=70, break_long_words=False, replace_whitespace=False)
# Wrap text
word_list = wrapper.wrap(text=story)

def getStory():
    return word_list