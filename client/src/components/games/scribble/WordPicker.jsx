export default function WordPicker({

    words,

    onSelect

}) {

    return (

        <div className="word-picker">

            <h1>

                ✏ Choose a Word

            </h1>

            <p>

                You have 20 seconds to choose.

            </p>

            <div className="word-grid">

                {

                    words.map(word=>(

                        <button

                            key={word}

                            className="word-btn"

                            onClick={()=>onSelect(word)}

                        >

                            {word}

                        </button>

                    ))

                }

            </div>

        </div>

    );

}