import React, { useState, useEffect } from "react";
import "./App.css";
import "@aws-amplify/ui-react/styles.css";
import { 
  Button,
  Flex,
  Heading,
  Image,
  Text,
  TextField,
  View,
  withAuthenticator,
} from "@aws-amplify/ui-react";
import { listNotes } from "./graphql/queries";
import { 
  createNote as createNoteMutation,
  deleteNote as deleteNoteMutation,
} from "./graphql/mutations";
import { Amplify } from 'aws-amplify';
import apiConfig from './aws-exports.js';
import storageConfig from './amplifyconfiguration.json';
import { generateClient } from 'aws-amplify/api';
import { getUrl, remove, uploadData } from 'aws-amplify/storage';

Amplify.configure(apiConfig);
Amplify.configure(storageConfig);
const apiClient = generateClient();

function App({ signOut }) { 
  const [notes, setNotes] = useState([]);

  useEffect(() => { 
    fetchNotes();
  }, []);

  async function fetchNotes() { 
    const apiData = await apiClient.graphql({ query: listNotes });
    const notesFromAPI = apiData.data.listNotes.items;
    await Promise.all(
      notesFromAPI.map(async (note) => { 
        if (note.image) { 
          const imgUrl = await getUrl({ key: note.name }).url;
          note.image = imgUrl;
        }
        return note;
      })
    );
    setNotes(notesFromAPI);
  }

  async function createNote(event) { 
    event.preventDefault();
    const form = new FormData(event.target);
    const image = form.get("image");
    const note = { 
      name: form.get("name"),
      description: form.get("description"),
      image: image.name,
    };
    try { 
      if (!!note.image) await uploadData({ key: note.name, data: image });
    } catch (error) { 
      console.log('Error : ', error);
    }
    
    await client.graphql({ 
      query: createNoteMutation,
      variables: { input: note },
    });
    fetchNotes();
    event.target.reset();
  }

  async function deleteNote({ id, name }) { 
    const newNotes = notes.filter((note) => note.id !== id);
    setNotes(newNotes);
    try { 
      await remove({ key: name} );
    } catch (error) { 
      console.log('Error ', error);
    }
    await client.graphql({ 
      query: deleteNoteMutation,
      variables: { input: { id } },
    });
  }

  return (
    <View className="App">
      <Heading level={ 1 }>My Notes App</Heading>
      <View as="form" margin="3rem 0" onSubmit={ createNote}>
        <Flex direction="row" justifyContent="center">
          <TextField
            name="name"
            placeholder="Note Name"
            label="Note Name"
            labelHidden
            variation="quiet"
            required
          />
          <TextField
            name="description"
            placeholder="Note Description"
            label="Note Description"
            labelHidden
            variation="quiet"
            required
          />
          <View
            name="image"
            as="input"
            type="file"
            style={ { alignSelf: "end" }}
          />
          <Button type="submit" variation="primary">
            Create Note
          </Button>
        </Flex>
      </View>
      <Heading level={ 2 }>Current Notes</Heading>
      <View margin="3rem 0">
        { notes.map((note) => (
          <Flex
            key={ note.id || note.name}
            direction="row"
            justifyContent="center"
            alignItems="center"
          >
            <Text as="strong" fontWeight={ 700 }>
              { note.name}
            </Text>
            <Text as="span">{ note.description }</Text>
            { note.image && (
              <Image
                src={ note.image }
                alt={ `visual aid for ${ notes.name }` }
                style={ { width: 400 } }
              />
            )}
            <Button variation="link" onClick={ () => deleteNote(note) }>
              Delete note
            </Button>
          </Flex>
        ))}
      </View>
      <Button onClick={ signOut }>Sign Out</Button>
    </View>
  );
}

export default withAuthenticator(App);